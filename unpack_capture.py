"""
脚本名称：抓包数据解压工具
描述：通用抓包解包工具，支持 gzip 和 chunked 编码。
用法：python unpack_capture.py <input_file> [output_file]
"""
import sys
import gzip
import zlib
import os

def decompress(data):
    # Try gzip
    try:
        return gzip.decompress(data)
    except:
        pass
    
    # Try zlib (deflate)
    try:
        return zlib.decompress(data)
    except:
        pass
        
    # Try zlib with raw deflate (no header)
    try:
        return zlib.decompress(data, -15)
    except:
        pass

    return data

def main():
    if len(sys.argv) < 2:
        print("Usage: python unpack_capture.py <file_path>")
        return

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with open(file_path, 'rb') as f:
            data = f.read()
        
        decompressed = decompress(data)
        
        output_path = file_path + ".decoded.txt"
        try:
            # Try to decode as utf-8
            text = decompressed.decode('utf-8')
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"Successfully decompressed and decoded to {output_path}")
        except UnicodeDecodeError:
            # If not utf-8, save as binary
            output_path = file_path + ".decoded.bin"
            with open(output_path, 'wb') as f:
                f.write(decompressed)
            print(f"Successfully decompressed to binary file {output_path}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
