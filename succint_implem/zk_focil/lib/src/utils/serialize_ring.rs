use k256::AffinePoint;

use super::serialize_point::{deserialize_point, serialize_point};

/// Serializes a ring of points into a string.
/// converts the points to strings and concatenates them.
pub fn serialize_ring(ring: &[AffinePoint]) -> String {
    let mut serialized = String::new();
    for point in ring {
        let point_str = &serialize_point(*point); // public_key_to_bigint(&serialize_point(*point));
        serialized.push_str(point_str);
    }
    serialized
}

pub fn deserialize_ring(ring: &[String]) -> Result<Vec<AffinePoint>, String> {
    let mut deserialized_points = Vec::new();

    for point in ring {
        let deserialized_point = deserialize_point(point.to_string())?;
        deserialized_points.push(deserialized_point);
    }

    Ok(deserialized_points)
}

