from setuptools import find_namespace_packages, setup


setup(
    name="cli-anything-opencut",
    version="0.1.0",
    description="cli-anything harness for OpenCut project editing",
    packages=find_namespace_packages(include=["cli_anything.*"]),
    include_package_data=True,
    package_data={
        "cli_anything.opencut": ["skills/*.md"],
    },
    install_requires=[
        "click>=8.0.0",
    ],
    entry_points={
        "console_scripts": [
            "cli-anything-opencut=cli_anything.opencut.opencut_cli:run_cli",
        ],
    },
    python_requires=">=3.10",
)
