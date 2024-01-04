#!/bin/sh

set -ex

python3 -m black ./src/
python3 -m black ./python_integ_tests/
python3 -m black ./python_unit_tests/

python3 -B -m isort ./src/ ./python_integ_tests/ ./python_unit_tests/
python3 -m flake8 --config=setup.cfg ./
