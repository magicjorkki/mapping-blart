import cv2
import pandas as pd
import os


# img;time;lat;lon;dir;
# 1.  2.   3.  4.  5.          

# blart_txt;other_txt;bold;eyes;nose;simpson;
# 6.        7.        8.   9.   10.  11.

# spray;main_col;black;pink;blue;yellow;red;green;white;
# 12.   13.      14.   15.  16.  17.    18. 19.   20.     

# base;base_mat;private_prop;
# 21.  22.      23.            

# new_img_req;unsure;notes
# 24.         25.    26.

csv_file = 'Mapping-Blart/data/csv/blart.csv'
img_dir = 'Mapping-Blart/data/img'

boolean_attrs = [
    'blart_txt', 'bold', 'eyes', 'nose', 'simpson', 
    'spray', 'black', 'pink', 'blue', 'yellow', 'red', 'green', 'white',
    'private_prop', 'new_img_req', 'unsure'
]

text_attrs = [
    'other_txt', 'main_col', 'base', 'base_mat', 'notes'
]

def label_images():
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found.")
        return
    
    df = pd.read_csv(csv_file, sep=',')

    for col in boolean_attrs + text_attrs:
        if col not in df.columns:
            df[col] = None

    for index, row in df.iterrows():
        already_filled = any(pd.notnull(row[attr]) for attr in boolean_attrs)
        
        if already_filled:
            continue

        img_filename = str(row['img']).strip()
        img_path = os.path.join(img_dir, img_filename)
        
        img = cv2.imread(img_path)
        
        if img is None:
            if img_path.lower().endswith('.jpg'):
                img = cv2.imread(img_path.replace('.jpg', '.JPG'))
            
            if img is None:
                print(f"\n[SKIP] Could not find: {img_path}")
                continue

        # Display 
        display_img = cv2.resize(img, (0,0), fx=0.4, fy=0.4) 
        cv2.imshow("Labeling - Check Terminal", display_img)
        cv2.waitKey(1) 

        print(f"\n{'='*40}")
        print(f" IMAGE: {img_filename} ({index + 1}/{len(df)})")
        print(f"{'='*40}")

        # Boolean inputs
        for attr in boolean_attrs:
            val = input(f"  > {attr}? (y/n) ").lower().strip()
            df.at[index, attr] = (val == 'y')

        # Text inputs
        for attr in text_attrs:
            val = input(f"  > {attr}: ").strip()
            df.at[index, attr] = val if val != "" else None

        df.to_csv(csv_file, index=False)
        print(f"\n[Progress Saved to {csv_file}]")

    cv2.destroyAllWindows()
    print("\nNo more images to label!")

if __name__ == "__main__":
    label_images()