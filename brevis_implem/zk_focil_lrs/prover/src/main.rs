use lsag::{
    SigningDetails, load_elf,
    lsag_verifier::LsagData,
    lsag_verifier::{Lsag, verify_lsag},
    sign_lsag,
    utils::generate_privatekey::generate_keypair,
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
    let public_values: LsagData =
        bincode::deserialize(&public_buffer).expect("Failed to deserialize");

    // Verify the public values
    verify_public_values(&public_values);
}

/// Verifies that the computed Fibonacci values match the public values.
fn verify_public_values(public_values: &LsagData) {
    println!("Public value: {:?}", public_values);

    // Compute Fibonacci values locally
    let result = verify_lsag(Lsag {
        ring: public_values.ring.clone(),
        message: public_values.message.clone(),
        c0: public_values.c0.clone(),
        responses: public_values.responses.clone(),
        key_image: public_values.key_image,
        linkability_flag: public_values.linkability_flag.clone(),
    });
    assert_eq!(result, public_values.verified, "Mismatch in verification");
}
