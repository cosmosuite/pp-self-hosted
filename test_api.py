import requests
import json

# Test the enhanced API with custom blur rules
url = "http://localhost:5001/api/v1/detect"

# Test blur rules - only blur faces, not nudity
blur_rules = {
    "FACE_FEMALE": True,
    "FACE_MALE": True,
    "FEMALE_GENITALIA_EXPOSED": False,
    "MALE_GENITALIA_EXPOSED": False,
    "FEMALE_BREAST_EXPOSED": False,
    "MALE_BREAST_EXPOSED": False,
    "BUTTOCKS_EXPOSED": False,
    "ANUS_EXPOSED": False,
    "BELLY_EXPOSED": False,
    "FEET_EXPOSED": False,
    "ARMPITS_EXPOSED": False,
    "FEMALE_GENITALIA_COVERED": False,
    "FEMALE_BREAST_COVERED": False,
    "BUTTOCKS_COVERED": False,
    "ANUS_COVERED": False,
    "BELLY_COVERED": False,
    "FEET_COVERED": False,
    "ARMPITS_COVERED": False,
}

# Test with a sample image (you'll need to provide an actual image file)
print("Testing API with custom blur rules...")
print("Blur rules:", json.dumps(blur_rules, indent=2))

# Test the labels endpoint
labels_response = requests.get("http://localhost:5001/api/v1/labels")
print("\nAvailable labels:")
print(json.dumps(labels_response.json(), indent=2))

print("\nAPI is ready! You can now test with the frontend at http://localhost:5173")
