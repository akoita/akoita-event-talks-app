import os
import shutil

def organize_files():
    # Folders mapping to file extensions
    folder_mapping = {
        'Images': ['.jpg', '.jpeg', '.gif', '.png'],
        'Documents': ['.txt', '.pdf', '.docx'],
        'Videos': ['.mp4', '.avi', '.mov']
    }

    # Ensure folders exist
    for folder in folder_mapping:
        if not os.path.exists(folder):
            os.makedirs(folder)
            print(f"Created directory: {folder}")

    moved_files = []

    # Iterate over files in current working directory
    for file_name in os.listdir('.'):
        # Only process files
        if os.path.isfile(file_name):
            # Skip core project files
            if file_name in ['requirements.txt', '.gitignore', 'app.py', 'README.md', 'organize.py']:
                continue

            _, ext = os.path.splitext(file_name)
            ext_lower = ext.lower()

            for folder, extensions in folder_mapping.items():
                if ext_lower in extensions:
                    dest_path = os.path.join(folder, file_name)
                    shutil.move(file_name, dest_path)
                    moved_files.append(f"{file_name} -> {folder}/")
                    print(f"Moved: {file_name} to {folder}/")
                    break

    if not moved_files:
        print("No matching files found to organize in the current directory.")
    else:
        print(f"Successfully organized {len(moved_files)} file(s).")

if __name__ == '__main__':
    organize_files()
