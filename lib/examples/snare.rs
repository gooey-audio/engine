/// Snare drum example
use oscillator::stage::Stage;
use oscillator::playback::setup_audio_stream;
use std::io::{self, Write};

fn main() -> anyhow::Result<()> {
    // Create a stage with default sample rate (will be updated by playback)
    let stage = Stage::new(44000.0);
    
    // Setup the audio stream with snare trigger callback
    let (_stream, audio_state) = setup_audio_stream(stage, |stage, time| {
        stage.trigger_snare(time);
        println!("Snare drum triggered at {:.2}s", time);
    })?;
    
    println!("Press '1' to trigger snare drum, 'q' to quit");
    
    // Main input loop
    loop {
        let mut input = String::new();
        io::stdout().flush().unwrap();
        io::stdin().read_line(&mut input).unwrap();
        
        match input.trim() {
            "1" => {
                println!("Triggering snare drum!");
                let mut state = audio_state.lock().unwrap();
                state.should_trigger = true;
            }
            "q" => {
                println!("Quitting...");
                break;
            }
            _ => {
                println!("Press '1' to trigger snare drum, 'q' to quit");
            }
        }
    }
    
    Ok(())
} 