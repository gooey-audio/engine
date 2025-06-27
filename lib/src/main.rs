/* This example expose parameter to pass generator of sample.
Good starting point for integration of cpal into your application.
*/

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SizedSample,
};
use cpal::{FromSample, Sample};
use std::sync::{Arc, Mutex};
use std::io::{self, Write};

mod envelope;
mod oscillator;
mod waveform;

use envelope::Envelope;
use oscillator::Oscillator;
use waveform::Waveform;

// Shared state for communication between main thread and audio callback
pub struct AudioState {
    pub should_trigger: bool,
    pub trigger_time: f32,
}

impl AudioState {
    fn new() -> Self {
        Self {
            should_trigger: false,
            trigger_time: 0.0,
        }
    }
}

// Native binary entry point for the oscillator engine

#[cfg(feature = "native")]
fn main() -> anyhow::Result<()> {
    // AudioState is defined in this file, and stream_setup_for is also in this file

    let audio_state = Arc::new(Mutex::new(AudioState::new()));
    let stream = stream_setup_for(audio_state.clone())?;
    stream.play()?;
    
    println!("Press '1' to trigger drum hit, 'q' to quit");
    
    // Main input loop
    loop {
        let mut input = String::new();
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut input).unwrap();
        
        match input.trim() {
            "1" => {
                println!("Triggering drum hit!");
                let mut state = audio_state.lock().unwrap();
                state.should_trigger = true;
            }
            "q" => {
                println!("Quitting...");
                break;
            }
            _ => {
                println!("Press '1' to trigger drum hit, 'q' to quit");
            }
        }
    }
    
    Ok(())
}

#[cfg(not(feature = "native"))]
fn main() {
    println!("This binary is only available with the 'native' feature enabled.");
}


pub fn stream_setup_for(audio_state: Arc<Mutex<AudioState>>) -> Result<cpal::Stream, anyhow::Error>
where
{
    let (_host, device, config) = host_device_setup()?;

    match config.sample_format() {
        cpal::SampleFormat::I8 => make_stream::<i8>(&device, &config.into(), audio_state),
        cpal::SampleFormat::I16 => make_stream::<i16>(&device, &config.into(), audio_state),
        cpal::SampleFormat::I32 => make_stream::<i32>(&device, &config.into(), audio_state),
        cpal::SampleFormat::I64 => make_stream::<i64>(&device, &config.into(), audio_state),
        cpal::SampleFormat::U8 => make_stream::<u8>(&device, &config.into(), audio_state),
        cpal::SampleFormat::U16 => make_stream::<u16>(&device, &config.into(), audio_state),
        cpal::SampleFormat::U32 => make_stream::<u32>(&device, &config.into(), audio_state),
        cpal::SampleFormat::U64 => make_stream::<u64>(&device, &config.into(), audio_state),
        cpal::SampleFormat::F32 => make_stream::<f32>(&device, &config.into(), audio_state),
        cpal::SampleFormat::F64 => make_stream::<f64>(&device, &config.into(), audio_state),
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

pub fn make_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    audio_state: Arc<Mutex<AudioState>>,
) -> Result<cpal::Stream, anyhow::Error>
where
    T: SizedSample + FromSample<f32>,
{
    let num_channels = config.channels as usize;
    let mut oscillator = Oscillator::new(
        config.sample_rate.0 as f32,
        300.0, // Lower frequency for drum-like sound
    );
    let err_fn = |err| eprintln!("Error building output sound stream: {}", err);

    let time_at_start = std::time::Instant::now();
    println!("Time at start: {:?}", time_at_start);

    let stream = device.build_output_stream(
        config,
        move |output: &mut [T], _: &cpal::OutputCallbackInfo| {
            let time_since_start = std::time::Instant::now()
                .duration_since(time_at_start)
                .as_secs_f32();
            
            // Check if we should trigger the oscillator
            {
                let mut state = audio_state.lock().unwrap();
                if state.should_trigger {
                    oscillator.trigger(time_since_start);
                    state.should_trigger = false;
                    state.trigger_time = time_since_start;
                    println!("Drum hit triggered at {:.2}s", time_since_start);
                }
            }
            
            process_frame(output, &mut oscillator, num_channels, time_since_start)
        },
        err_fn,
        None,
    )?;

    Ok(stream)
}

fn process_frame<SampleType>(
    output: &mut [SampleType],
    oscillator: &mut Oscillator,
    num_channels: usize,
    current_time: f32,
) where
    SampleType: Sample + FromSample<f32>,
{
    for frame in output.chunks_mut(num_channels) {
        let value: SampleType = SampleType::from_sample(oscillator.tick(current_time));

        // copy the same value to all channels
        for sample in frame.iter_mut() {
            *sample = value;
        }
    }
}
