import os
import exifread
import csv
from PIL import Image
from pillow_heif import register_heif_opener




def heic_to_jpg(img_input_path, img_output_folder):
    register_heif_opener() # for Pillow to read HEIC

    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_output_dir = os.path.join(script_dir, img_output_folder)
    
    # Errors if img or output dir not found
    if not os.path.exists(abs_output_dir):
        print(f'Output dir "{abs_output_dir}" not found')
        return None
    if not os.path.exists(img_input_path):
        print(f'Img "{img_input_path}" not found')
        return None

    # Get filename from the full path
    file_name = os.path.basename(img_input_path)
    
    # Skip Apple metadata
    if file_name.startswith('._'):
        return None

    file_root = os.path.splitext(file_name)[0]
    img_output_path = os.path.join(abs_output_dir, f'{file_root}.jpg')
    
    try:
        img = Image.open(img_input_path)
        exif_data = img.info.get('exif')
        img = img.convert('RGB')
        
        if exif_data:
            img.save(img_output_path, 'JPEG', quality=85, exif=exif_data)
            print(f'{file_name} converted to JPG with EXIF data')
        else:
            img.save(img_output_path, 'JPEG', quality=85)
            print(f'{file_name} converted to JPG >>without<< EXIF data')
        return img_output_path
        
    except Exception as e:
        print(f"Error with {file_name}: {e}")
        return None




def dms_to_deg(dms_value): # Convert DMS (deg, min, sec) to decimal degrees
    d = float(dms_value.values[0].num) / float(dms_value.values[0].den)
    m = float(dms_value.values[1].num) / float(dms_value.values[1].den)
    s = float(dms_value.values[2].num) / float(dms_value.values[2].den)
    return d+(m/60)+(s/3600)




def read_exif(filename):
    file = open(filename, 'rb')
    tags = exifread.process_file(file)

    date = tags.get('EXIF DateTimeOriginal')
    direction = tags.get('GPS GPSImgDirection')    
    lat_value = tags.get('GPS GPSLatitude')
    lat_ref = tags.get('GPS GPSLatitudeRef')
    lon_value = tags.get('GPS GPSLongitude')
    lon_ref = tags.get('GPS GPSLongitudeRef')
    
    if lat_value and lat_ref and lon_value and lon_ref:
        lat = dms_to_deg(lat_value)
        if lat_ref.values[0] == 'S':
            lat = -lat
        lon = dms_to_deg(lon_value)
        if lon_ref.values[0] == 'W':
            lon = -lon
        return [round(lat, 6), round(lon, 6), direction, date]




def write_to_csv(data, csv_file):
    # Create CSV if doesnt exists
    csv_dir = os.path.dirname(csv_file)
    if not os.path.exists(csv_dir):
        os.makedirs(csv_dir, exist_ok=True)

    # Load existing filenames (double check)
    imgs_in_csv = []
    if os.path.exists(csv_file):
        try:
            with open(csv_file, mode='r', encoding='utf-8') as blarts_file:
                reader = csv.reader(blarts_file, delimiter=',')
                next(reader, None)
                for row in reader:
                    if row:
                        imgs_in_csv.append(row[0])
        except Exception as e:
            print(e)

    file_is_new = not os.path.exists(csv_file)
    with open(csv_file, mode='a', newline='', encoding='utf-8') as blarts_file:
        results_writer = csv.writer(blarts_file, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        # Header if new file
        if file_is_new:
            results_writer.writerow(['img','time','lat','lon','dir',
                                    'blart_txt','other_txt','bold','eyes','nose','simpson',
                                    'spray','main_col','black','pink','blue','yellow','red','green','white',
                                    'base','base_mat','private_prop',
                                    'new_img_req','unsure','notes'])
            # img;time;lat;lon;dir;blart_txt;other_txt;bold;eyes;nose;simpson;spray;main_col;black;pink;blue;yellow;red;green;white;base;base_mat;private_prop;new_img_req;unsure;notes
            # 1.  2.   3.  4.  5.  6.        7.        8.   9.   10.  11.     12.   13.      14.   15.  16.  17.    18. 19.   20.   21.  22.      23.          24.         25.    26.
        for row in data:
            #original_full_path = row[0]
            if row[0] in imgs_in_csv: # Skip
                print(f'Skipped {row[0]}')
                continue
            else:
                results_writer.writerow(row)
                print(f'Wrote {row[0]} to CSV')




def main(img_input_folder, img_output_folder, csv_file):
    base_path = os.path.dirname(os.path.abspath(__file__))
    abs_input_dir = os.path.join(base_path, img_input_folder)
    abs_output_dir = os.path.join(base_path, img_output_folder)
    abs_csv_path = os.path.join(base_path, csv_file)

    existing_imgs = []

    # Get img filenames from CSV (if exists)
    if os.path.exists(csv_file):
        try:
            with open(csv_file, mode='r', encoding='utf-8') as blarts_csv:
                reader = csv.reader(blarts_csv, delimiter=',')
                next(reader, None)
                for row in reader:
                    if row:
                        filename = row[0].split('.')[0]
                        existing_imgs.append(filename)
        except Exception:
            None

    # Imgs to process minus existing imgs in CSV
    imgs_to_process = [os.path.splitext(f)[0] for f in os.listdir(abs_input_dir) if f.lower().endswith('.heic') and not f.startswith('._')]
    imgs_to_process = [item for item in imgs_to_process if item not in existing_imgs]

    # Convert each to jpg
    for img in imgs_to_process:
        img_path = os.path.join(abs_input_dir, f"{img}.heic")
        heic_to_jpg(img_path, abs_output_dir)

    # Read EXIFs to data and write CSV
    data = []
    for image in os.listdir(abs_output_dir):
        filename = os.fsdecode(image)
        if filename.lower().endswith(('.jpg', '.jpeg')) and not filename.startswith('._'):
            file_path = os.path.join(abs_output_dir, filename)
            try:
                exif = read_exif(file_path)
                lat = exif[0]
                lon = exif[1]
                dir = round(eval(str(exif[2])), 2)
                time = str(exif[3])
                row = [filename, time, lat, lon, dir] + ([''] * 21)
                data.append(row)
            except Exception as e:
                print(f'Error reading EXIF for {filename}: {e}')
        else:
            continue
    write_to_csv(data, abs_csv_path)
    print('#################### Ready! ####################')




#     HEIC dir        JPG dir     CSV file
main('data/img_new', 'data/img', 'data/csv/blart.csv')