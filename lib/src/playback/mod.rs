use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SizedSample,
};
use cpal::{FromSample, Sample};
use std::sync::{Arc, Mutex};

use crate::stage::Stage;
use crate::gen::oscillator::Oscillator;

// Shared state for communication between main thread and audio callback
pub struct AudioState {
    pub should_trigger: bool,
    pub trigger_time: f32,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            should_trigger: false,
            trigger_time: 0.0,
        }
    }
}

/// Setup and run a CPAL audio stream with the given stage
/// Returns the audio state for external control
pub fn setup_audio_stream<F>(stage: Stage, trigger_callback: F) -> anyhow::Result<(cpal::Stream, Arc<Mutex<AudioState>>)>
where
    F: Fn(&mut Stage, f32) + Send + Sync + 'static,
{
    let audio_state = Arc::new(Mutex::new(AudioState::new()));
    let stream = stream_setup_for(audio_state.clone(), stage, trigger_callback)?;
    stream.play()?;
    
    Ok((stream, audio_state))
}

pub fn stream_setup_for<F>(
    audio_state: Arc<Mutex<AudioState>>, 
    mut stage: Stage,
    trigger_callback: F,
) -> Result<cpal::Stream, anyhow::Error>
where
    F: Fn(&mut Stage, f32) + Send + Sync + 'static,
{
    let (_host, device, config) = host_device_setup()?;

    // Update stage with the correct sample rate
    stage.sample_rate = config.sample_rate().0 as f32;

    match config.sample_format() {
        cpal::SampleFormat::I8 => make_stream::<i8, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::I16 => make_stream::<i16, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::I32 => make_stream::<i32, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::I64 => make_stream::<i64, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::U8 => make_stream::<u8, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::U16 => make_stream::<u16, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::U32 => make_stream::<u32, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::U64 => make_stream::<u64, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::F32 => make_stream::<f32, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        cpal::SampleFormat::F64 => make_stream::<f64, _>(&device, &config.into(), audio_state, stage, trigger_callback),
        sample_format => Err(anyhow::Error::msg(format!(
            "Unsupported sample format '{sample_format}'"
        ))),
    }
}

pub fn host_device_setup(
) -> Result<(cpal::Host, cpal::Device, cpal::SupportedStreamConfig), anyhow::Error> {
    let host = cpal::default_host();

    let device = host
        .default_output_device()
        .ok_or_else(|| anyhow::Error::msg("Default output device is not available"))?;
    println!("Output device : {}", device.name()?);

    let config = device.default_output_config()?;
    println!("Default output config : {:?}", config);

    Ok((host, device, config))
}

pub fn make_stream<T, F>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    audio_state: Arc<Mutex<AudioState>>,
    mut stage: Stage,
    trigger_callback: F,
) -> Result<cpal::Stream, anyhow::Error>
where
    T: SizedSample + FromSample<f32>,
    F: Fn(&mut Stage, f32) + Send + Sync + 'static,
{
    let num_channels = config.channels as usize;
    let sample_rate = config.sample_rate.0 as f32;
    
    let err_fn = |err| eprintln!("Error building output sound stream: {}", err);

    let time_at_start = std::time::Instant::now();
    println!("Time at start: {:?}", time_at_start);

    let stream = device.build_output_stream(
        config,
        move |output: &mut [T], _: &cpal::OutputCallbackInfo| {
            let mut time_since_start = std::time::Instant::now()
                .duration_since(time_at_start)
                .as_secs_f32();
            
            // Check if we should trigger the stage
            {
                let mut state = audio_state.lock().unwrap();
                if state.should_trigger {
                    // Call the provided callback to handle the trigger
                    trigger_callback(&mut stage, time_since_start);
                    state.should_trigger = false;
                    state.trigger_time = time_since_start;
                    println!("Trigger requested at {:.2}s", time_since_start);
                }
            }
            
            // Process each sample continuously (like debug-ui ScriptProcessorNode)
            for frame in output.chunks_mut(num_channels) {
                // Get the audio sample from the stage
                let value: T = T::from_sample(stage.tick(time_since_start));

                // Copy the same value to all channels
                for sample in frame.iter_mut() {
                    *sample = value;
                }
                
                // Advance time for next sample
                time_since_start += 1.0 / sample_rate;
            }
        },
        err_fn,
        None,
    )?;

    Ok(stream)
} 