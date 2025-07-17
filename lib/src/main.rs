/* This example expose parameter to pass generator of sample.
Good starting point for integration of cpal into your application.
*/

use std::io::{self, Write};

// Import the platform abstraction and audio engine
use oscillator::platform::{AudioEngine, CpalOutput, AudioOutput};
use oscillator::gen::oscillator::Oscillator;

// Native binary entry point for the oscillator engine

#[cfg(feature = "native")]
fn main() -> anyhow::Result<()> {
    // Create the audio engine
    let audio_engine = AudioEngine::new(44100.0);
    
    // Configure the stage with an oscillator
    audio_engine.with_stage(|stage| {
        let mut oscillator = Oscillator::new(44100.0, 200.0);
        oscillator.waveform = oscillator::gen::waveform::Waveform::Triangle;
        stage.add(oscillator);
    });
    
    // Create and configure the CPAL output
    let mut cpal_output = CpalOutput::new();
    cpal_output.initialize(44100.0)?;
    cpal_output.create_stream_with_stage(
        audio_engine.stage(),
        audio_engine.audio_state(),
    )?;
    
    // Start the audio stream
    cpal_output.start()?;

    println!("Press '1' to trigger oscillator, 'q' to quit");

    // Main input loop
    loop {
        let mut input = String::new();
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut input).unwrap();

        match input.trim() {
            "1" => {
                println!("Triggering oscillator!");
                audio_engine.trigger_all();
            }
            "q" => {
                println!("Quitting...");
                break;
            }
            _ => {
                println!("Press '1' to trigger oscillator, 'q' to quit");
            }
        }
    }

    Ok(())
}

#[cfg(not(feature = "native"))]
fn main() {
    println!("This binary is only available with the 'native' feature enabled.");
}
