"""Uygulama şifresinin özetini üretir.

Çıktı base64 kodlu bir bcrypt özetidir; '$' içermediği için Docker Compose'un
.env değişken yerine koyması onu bozmaz.

    python server/scripts/sifre_ozeti.py <şifre>
"""

import base64
import sys

import bcrypt


def ozet(sifre: str) -> str:
    return base64.b64encode(bcrypt.hashpw(sifre.encode(), bcrypt.gensalt())).decode()


if __name__ == "__main__":
    print(ozet(sys.argv[1]))
