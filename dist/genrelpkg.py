import os
import sys
import json
import zipfile
from pathlib import Path

def create_zip_dist(directory: str):
    directory_path = Path(directory).resolve()
    releaseinfo_path = directory_path / "releaseinfo.json"
    
    # Check if releaseinfo.json exists
    if not releaseinfo_path.exists():
        print(f"Error: No releaseinfo.json file found in {directory}")
        sys.exit(1)
    
    # Load release information
    with open(releaseinfo_path, "r") as file:
        release_info = json.load(file)

    # Extract required attributes
    try:
        name = release_info["name"]
        shortname = release_info["shortname"]
        release_date = release_info["releaseDate"]
        version = release_info["version"]
        zipdist = release_info["zipdist"]
        
        include_files = zipdist.get("include", [])
        exclude_files = zipdist.get("exclude", [])
        filename_template = zipdist["filename"]
    except KeyError as e:
        print(f"Error: Missing key in releaseinfo.json: {e}")
        sys.exit(1)
    
    # Prepare output filename with replacements
    filename = filename_template.format(name=name, shortname=shortname, releaseDate=release_date, version=version)
    output_path = (directory_path / filename).resolve()
    
    # Collect files to include in the zip file and check existence
    files_to_zip = set()
    
    def add_files(file_or_dir):
        path = directory_path / file_or_dir
        if not path.exists():
            print(f"Error: Included file or directory '{file_or_dir}' does not exist.")
            sys.exit(1)
        
        if path.is_dir():
            for root, _, files in os.walk(path):
                for file in files:
                    files_to_zip.add(Path(root) / file)
        elif path.is_file():
            files_to_zip.add(path)
    
    # Add included files and directories
    for item in include_files:
        add_files(item)
    
    # Exclude specified files
    files_to_zip = {f for f in files_to_zip if not any(f.relative_to(directory_path).match(excl) for excl in exclude_files)}

    # Write files to the zip file
    with zipfile.ZipFile(output_path, "w") as zipf:
        for file_path in files_to_zip:
            arcname = file_path.relative_to(directory_path)
            zipf.write(file_path, arcname)
    
    print(f"Distribution zip created at {output_path}")

if __name__ == "__main__":
    # Ensure a directory argument is provided
    if len(sys.argv) != 2:
        print("Usage: python zipdist.py <directory>")
        sys.exit(1)

    # Run the zip distribution creation
    create_zip_dist(sys.argv[1])
