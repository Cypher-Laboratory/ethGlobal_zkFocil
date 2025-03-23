//! An end-to-end example of using the SP1 SDK to generate and verify a proof for
//! LSAG signature verification.
//!
//! You can run this script using the following command:
//! ```shell
//! RUST_LOG=info cargo run --release -- --execute
//! ```
//! or
//! ```shell
//! RUST_LOG=info cargo run --release -- --prove
//! ```

use lsag::{
    SigningDetails,
    lsag_verifier::{Lsag, LsagData, verify_lsag},
    sign_lsag,
    utils::generate_privatekey::generate_keypair,
};
use sp1_sdk::{ProverClient, SP1Stdin};
use std::env;

/// The ELF (executable and linkable format) file for the Succinct RISC-V zkVM.
/// We'll load this at runtime since the environment variable isn't available at compile time
fn load_elf() -> Vec<u8> {
    // Directly use the compiled "fibonacci" program which actually contains our LSAG code
    let local_path = "../target/elf-compilation/riscv32im-succinct-zkvm-elf/release/lsag-programm";
    println!("Loading ELF file from: {}", local_path);
    std::fs::read(local_path).expect("Failed to read ELF file")
}

/// Simple structure to hold command line arguments
struct Args {
    execute: bool,
    prove: bool,
}

fn main() {
    // Setup the logger.
    sp1_sdk::utils::setup_logger();
    dotenv::dotenv().ok();

    // Parse command line arguments manually instead of using clap
    let args = {
        let args: Vec<String> = env::args().collect();
        let execute = args.iter().any(|arg| arg == "--execute");
        let prove = args.iter().any(|arg| arg == "--prove");
        
        Args { execute, prove }
    };

    if args.execute == args.prove {
        eprintln!("Error: You must specify either --execute or --prove");
        std::process::exit(1);
    }

    // Setup the prover client.
    let client = ProverClient::from_env();
    
    // Load the ELF file at runtime
    let lsag_verifier_elf = load_elf();

    // Generate keys and create signature for testing
    let (private_key1, public_key1) = generate_keypair();
    let (_, public_key2) = generate_keypair();
    let (_, public_key3) = generate_keypair();

    let ring = vec![public_key1, public_key2, public_key3];

    let signing_details = SigningDetails {
        private_key: private_key1,
        public_key: public_key1,
        index: 0,
    };

    let message = "test message".to_string();
    let linkability_flag = Some("linkability test".to_string());

    let signature = sign_lsag(message.clone(), &ring, &signing_details, linkability_flag);

    // Setup the inputs.
    let mut stdin = SP1Stdin::new();
    stdin.write(&signature);

    println!("LSAG signature created for message: {}", message);

    if args.execute {
        // Execute the program
        let (output, report) = client.execute(&lsag_verifier_elf, &stdin).run().unwrap();
        println!("Program executed successfully.");

        // Access the raw bytes from the output
        let output_bytes = output.as_ref();
        println!("Output bytes length: {}", output_bytes.len());
        
        // Try to deserialize with serde_json
        let result_data: LsagData = match serde_json::from_slice(output_bytes) {
            Ok(data) => data,
            Err(e) => {
                println!("Error deserializing output with serde_json: {}", e);
                // Fallback to trying bincode
                match bincode::deserialize(output_bytes) {
                    Ok(data) => data,
                    Err(e2) => {
                        println!("Error deserializing output with bincode: {}", e2);
                        // Print first few bytes for debugging
                        println!("First 20 bytes: {:?}", &output_bytes[..20.min(output_bytes.len())]);
                        panic!("Deserialization failed");
                    }
                }
            }
        };
        
        // Print the verification result
        println!("Signature verified: {}", result_data.verified);
        
        // Verify locally to ensure correctness
        let local_result = verify_lsag(Lsag {
            ring: result_data.ring.clone(),
            message: result_data.message.clone(),
            c0: result_data.c0.clone(),
            responses: result_data.responses.clone(),
            key_image: result_data.key_image,
            linkability_flag: result_data.linkability_flag.clone(),
        });
        
        assert_eq!(local_result, result_data.verified, "Mismatch in verification");
        println!("Values are correct!");

        // Record the number of cycles executed.
        println!("Number of cycles: {}", report.total_instruction_count());
    } else {
        // Setup the program for proving.
        let (pk, vk) = client.setup(&lsag_verifier_elf);

        // Generate the proof
        let proof = client
            .prove(&pk, &stdin)
            .run()
            .expect("failed to generate proof");

        println!("Successfully generated proof!");

        // Verify the proof.
        client.verify(&proof, &vk).expect("failed to verify proof");
        println!("Successfully verified proof!");
        
        // Get the public values from the proof
        let public_bytes = proof.public_values.as_ref();
        println!("Public values bytes length: {}", public_bytes.len());
        
        // Try to deserialize with serde_json first
        let public_values: LsagData = match serde_json::from_slice(public_bytes) {
            Ok(data) => data,
            Err(e) => {
                println!("Error deserializing public values with serde_json: {}", e);
                // Fallback to bincode
                match bincode::deserialize(public_bytes) {
                    Ok(data) => data,
                    Err(e2) => {
                        println!("Error deserializing public values with bincode: {}", e2);
                        // Print first few bytes for debugging
                        println!("First 20 bytes: {:?}", &public_bytes[..20.min(public_bytes.len())]);
                        panic!("Deserialization failed");
                    }
                }
            }
        };
                
            // Print and verify the public values
            println!("Public values: {:?}", public_values);
            
            // Verify locally
            let local_result = verify_lsag(Lsag {
                ring: public_values.ring.clone(),
                message: public_values.message.clone(),
                c0: public_values.c0.clone(),
                responses: public_values.responses.clone(),
                key_image: public_values.key_image,
                linkability_flag: public_values.linkability_flag.clone(),
            });
            
            assert_eq!(local_result, public_values.verified, "Mismatch in verification");
            println!("Verification result is correct!");
        }
    }
