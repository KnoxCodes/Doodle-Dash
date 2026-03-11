import torch
import numpy as np
import cv2
import numpy as np
from PIL import Image
import io
from model import DoodleCNN


classes = [
    "cat",
    "dog",
    "fish",
    "car",
    "apple",
    "tree",
    "house",
    "star",
    "crown",
    "airplane"
]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = DoodleCNN(len(classes))
model.load_state_dict(torch.load("../doodle_dash_cnn.pth", map_location=device))
model.eval()
model.to(device)


def preprocess_image(image_bytes):

    image = Image.open(io.BytesIO(image_bytes)).convert("L")
    image = np.array(image)

    # invert if background is white
    image = 255 - image

    # threshold
    _, image = cv2.threshold(image, 50, 255, cv2.THRESH_BINARY)

    # find bounding box
    coords = cv2.findNonZero(image)
    x, y, w, h = cv2.boundingRect(coords)

    image = image[y:y+h, x:x+w]

    # resize
    image = cv2.resize(image, (28, 28))

    image = image / 255.0

    image = np.expand_dims(image, axis=0)
    image = np.expand_dims(image, axis=0)

    tensor = torch.tensor(image, dtype=torch.float32)

    return tensor


def predict(image_bytes):

    img = preprocess_image(image_bytes)

    with torch.no_grad():

        outputs = model(img)

        probs = torch.softmax(outputs, dim=1)

        top_probs, top_classes = torch.topk(probs, 3)

    predictions = []

    for prob, cls in zip(top_probs[0], top_classes[0]):

        predictions.append({
            "class": classes[cls],
            "confidence": float(prob)
        })

    return predictions