use lsag::{
    SigningDetails,
    lsag_verifier::{Lsag, verify_lsag},
    sign_lsag,
    utils::generate_keypair,
};
use pico_sdk::{client::DefaultProverClient, init_logger};
fn main() {
    // Initialize logger
    init_logger();

    // Load the ELF file
    let elf = load_elf("../elf/riscv32im-pico-zkvm-elf");

    // Initialize the prover client
    let client = DefaultProverClient::new(&elf);
    let stdin_builder = client.get_stdin_builder();

    // Set up input
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

    let signature = sign_lsag(message, &ring, &signing_details, linkability_flag);
    stdin_builder.borrow_mut().write(&signature);

    // Generate proof
    let proof = client.prove_fast().expect("Failed to generate proof");

    // Decodes public values from the proof's public value stream.
    let public_buffer = proof.pv_stream.unwrap();

    // Deserialize public_buffer into Lsag
    let public_values: Lsag = bincode::deserialize(&public_buffer).expect("Failed to deserialize");

    // Verify the public values
    verify_public_values(signature, &public_values);
}

/// Verifies that the computed Fibonacci values match the public values.
fn verify_public_values(result: u32, public_values: &FibonacciData) {
    println!(
        "Public value n: {:?}, a: {:?}, b: {:?}",
        public_values.n, public_values.a, public_values.b
    );

    // Compute Fibonacci values locally
    let (result_a, result_b) = fibonacci(0, 1, n);

    // Assert that the computed values match the public values
    assert_eq!(result_a, public_values.a, "Mismatch in value 'a'");
    assert_eq!(result_b, public_values.b, "Mismatch in value 'b'");
}
