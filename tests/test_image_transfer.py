import numpy as np

from research.image_transfer import measure_entropy, noise_sweep, resolution_sweep


def test_constant_image_has_zero_entropy():
    assert measure_entropy(np.zeros((32, 32))) == 0


def test_resolution_loss_is_bounded_and_worsens_for_checkerboard():
    image = np.indices((64, 64)).sum(axis=0) % 2
    rows = resolution_sweep(image.astype(float), factors=(2, 4))
    assert all(0 <= row["ssim"] <= 1 for row in rows)
    assert rows[1]["ssim"] <= rows[0]["ssim"]


def test_noise_sweep_is_seed_reproducible():
    image = np.linspace(0, 1, 64 * 64).reshape(64, 64)
    assert noise_sweep(image, sigmas=(0.01,), seed=5) == noise_sweep(
        image, sigmas=(0.01,), seed=5
    )
