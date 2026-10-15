import random


def shuffle_options(mcqs: list[dict], seed: str) -> list[dict]:
    """Model doğru cevabı belli şıklara yığabiliyor; şıkları deterministik karıştırır.

    4 şıklı olmayan ya da doğru şık sırası geçersiz sorular atılır.
    """
    rng = random.Random(seed)
    out = []
    for q in mcqs:
        opts = list(q["options"])
        if len(opts) != 4 or not (0 <= q["correct_option"] < 4):
            continue
        correct = opts[q["correct_option"]]
        rng.shuffle(opts)
        out.append({**q, "options": opts, "correct_option": opts.index(correct)})
    return out
