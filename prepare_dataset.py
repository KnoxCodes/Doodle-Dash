import numpy as np
import os

DATA_PATH = "data"

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

samples_per_class = 10000

X = []
y = []

for label, cls in enumerate(classes):

    file_path = os.path.join(DATA_PATH, f"{cls}.npy")

    data = np.load(file_path)

    # reduce dataset size
    data = data[:samples_per_class]

    # reshape to images
    data = data.reshape(-1, 28, 28)

    X.append(data)

    # create labels
    y.append(np.full(samples_per_class, label))

# merge all classes
X = np.concatenate(X)
y = np.concatenate(y)

# shuffle dataset
shuffle_idx = np.random.permutation(len(X))

X = X[shuffle_idx]
y = y[shuffle_idx]

print("Dataset shape:", X.shape)
print("Labels shape:", y.shape)

# save final dataset
np.save("X.npy", X)
np.save("y.npy", y)

print("Dataset saved successfully")