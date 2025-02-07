import albumentations as alb
from albumentations.pytorch import ToTensorV2

train_transform = alb.Compose(
    [
        alb.Compose(
            [
                alb.Affine(translate_percent=0, scale=(0.85, 1.0), rotate=(-1, 1), interpolation=3, fill=255, p=1),
                alb.GridDistortion(distort_limit=0.1, interpolation=3, p=.5)
            ], p=.15
        ),
        # alb.InvertImg(p=.15),
        alb.RGBShift(r_shift_limit=15, g_shift_limit=15, b_shift_limit=15, p=0.3),
        alb.GaussNoise(std_range=(0, 0.2), p=.2),
        alb.RandomBrightnessContrast(.05, (-.2, 0), True, p=0.2),
        alb.ImageCompression(quality_range=(95, 95), p=.3),
        alb.ToGray(p=1),
        alb.Normalize((0.7931, 0.7931, 0.7931), (0.1738, 0.1738, 0.1738)),
        # alb.Sharpen()
        ToTensorV2(),
    ]
)
test_transform = alb.Compose(
    [
        alb.ToGray(p=1),
        alb.Normalize((0.7931, 0.7931, 0.7931), (0.1738, 0.1738, 0.1738)),
        # alb.Sharpen()
        ToTensorV2(),
    ]
)
