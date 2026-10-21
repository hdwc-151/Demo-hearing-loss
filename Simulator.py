import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter
import matplotlib.pyplot as plt

# 1. Hàm thiết kế bộ lọc (Mô phỏng mất thính lực tần số cao)
def butter_lowpass(cutoff, fs, order=5):
    # cutoff: Tần số bắt đầu bị điếc (ví dụ: 2000 Hz)
    # fs: Sample rate của file audio
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    b, a = butter(order, normal_cutoff, btype='low', analog=False)
    return b, a

def apply_hearing_loss(data, cutoff, fs, order=5):
    b, a = butter_lowpass(cutoff, fs, order=order)
    y = lfilter(b, a, data)
    return y

# 2. Xử lý Audio
def simulate(input_file, output_file, loss_type="mild_high_freq"):
    # Đọc file âm thanh gốc (Bạn tự chuẩn bị 1 file giọng nói test.wav)
    try:
        data, fs = sf.read(input_file)
    except Exception as e:
        print("Vui lòng tạo 1 file 'input.wav' để chạy demo.")
        return

    # Nếu file là stereo, chuyển về mono để dễ xử lý
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)

    # Thiết lập ngưỡng cắt (Cutoff frequency) tùy theo mức độ bệnh
    if loss_type == "mild_high_freq":
        cutoff = 3000.0 # Bắt đầu điếc nhẹ từ 3000Hz
        order = 2       # Độ dốc từ từ
    elif loss_type == "severe_high_freq":
        cutoff = 1000.0 # Mất thính lực nặng, không nghe được tiếng chim hót, giọng nữ/trẻ em
        order = 6       # Độ dốc rất gắt

    # Áp dụng bộ lọc
    simulated_data = apply_hearing_loss(data, cutoff, fs, order)

    # Lưu file kết quả để nghe thử
    sf.write(output_file, simulated_data, fs)
    print(f"Đã lưu mô phỏng '{loss_type}' vào: {output_file}")

# Chạy thử
if __name__ == "__main__":
    simulate("input.wav", "output_mild.wav", "mild_high_freq")
    simulate("input.wav", "output_severe.wav", "severe_high_freq")
    # GIẢ ĐỊNH: Bạn có file input.wav trong cùng thư mục
    # Hãy tạo 1 file input.wav bằng cách ghi âm giọng nói của bạn
    # simulate("input.wav", "output_mild.wav", "mild_high_freq")
    # simulate("input.wav", "output_severe.wav", "severe_high_freq")
    print("Mã nguồn DSP đã sẵn sàng. Hãy cung cấp file .wav để chạy filter.")