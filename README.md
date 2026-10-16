# Hỷ Studio · Thiệp cưới web tương tác

## Bản cập nhật 1.2 — Music Library (16/10/2026)

Tập trung cải thiện nhạc nền của Hỷ Studio v1.1:

- **Bốn bản phối mới, phát trực tiếp từ tệp MP3 trong gói**:

  | Bài | Phong cách | Thời lượng gần đúng |
  |---|---|---|
  | Lời Hẹn Trăm Năm | Piano, sáo, dây | 1:03 |
  | Duyên Ngọc Phương Đông | Phong vị Á Đông, dây gảy mô phỏng, sáo | 1:00 |
  | Ngày Vui Chung Đôi | Tươi vui, guitar, piano | 0:53 |
  | Bình Minh Hạnh Phúc | Nhẹ, music box, dàn dây | 1:10 |

  Đây là các **bản phối nhạc cụ ảo tự soạn/synthesise** bằng SoundFont, không phải bài hát ca sĩ hoặc bản thu phòng thu. Các bản MP3 đã được đóng gói. Tệp `generate_music.py` chỉ phục vụ tái tạo tham khảo và đòi hỏi thư viện FluidSynth, SoundFont tương thích, numpy và ffmpeg nếu muốn chạy lại; **không phải dependency khi chạy website**.

- **Hai bản cổ điển được cấp phép CC BY 3.0**, nghe qua URL có mạng: [Canon in D Major – Kevin MacLeod](https://commons.wikimedia.org/wiki/File:Canon_in_D_Major_(ISRC_USUAN1100301).mp3) và [Gymnopédie No. 1 – Kevin MacLeod](https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1_(ISRC_USUAN1100787).mp3). Phần trình phát gắn attribution và liên kết giấy phép ngay trong thiệp chia sẻ; chúng không được đóng gói offline. Nếu không có kết nối Internet, chọn một trong bốn bản MP3 có sẵn.
- Thư viện nhạc mới có **lọc thể loại, phát/tạm dừng, thanh tua, thời gian, âm lượng, chọn vị trí bắt đầu 0/15/30/45 giây**, phát lặp sau khi kết thúc. Trình duyệt không tự động phát nhạc khi khách chưa tương tác.
- **Tải nhạc MP3 riêng, tối đa 8 MB**: người tạo chọn file rồi nhấn `Lưu thiệp`. Máy chủ nhận file sau khi kiểm tra quyền chỉnh sửa và cấu trúc MP3 cơ bản. Khi mở liên kết, khách nghe được đúng file này qua API `GET /api/cards/:id/music` (hỗ trợ `Range` để tua). Không phải mở riêng link file; không tải MP3 lên dịch vụ thứ ba.
- Nhạc tải riêng ở `DATA_DIR/music/<cardId>.mp3`, được xóa cùng thiệp **sau 30 ngày kể từ lúc tạo**, không gia hạn sau khi chỉnh sửa. **Bảo toàn thư mục `data/` khi cập nhật website** để giữ file MP3 đã được người dùng tải lên; thay `public/`, `server.js`, `package.json`, `README.md` và `test-api.js`.
- Các thiệp v1.1 dùng ba track cũ (Lụa hồng, Song Hỷ, Trăng Viên) vẫn phát được; track cũ nằm trong mục xếp gọn tương thích.

### Lưu ý cho việc kinh doanh / bản quyền nhạc

Người dùng chỉ được tải lên nhạc mà họ sở hữu hoặc được cấp phép sử dụng và phát trên website. Việc có file MP3 cá nhân **không đồng nghĩa có quyền phát công khai một ca khúc thương mại**. Nên triển khai thông báo quyền sử dụng, quy trình báo cáo vi phạm, giới hạn dung lượng/tần suất và thiết lập bảo mật trước khi mở công khai. Hai bản cổ điển theo CC BY 3.0 yêu cầu giữ ghi công. Hãy kiểm tra lại quyền, khả năng truy cập link nguồn và giấy phép khi đưa vào thương mại.

### Kiểm thử bản nhạc

`node --check server.js` và `node test-api.js` (cần một máy chủ đang chạy; với port khác, dùng `TEST_BASE_URL`). Bộ test bao gồm token quyền sửa, tải MP3, chống tệp giả, phản hồi HTTP Range 206 và TTL.

**Giới hạn xác minh:** luồng API đã được kiểm thử tự động; môi trường duyệt web hiện chặn truy cập localhost/file nên ảnh giao diện bản 1.2 và khả năng phát nhạc trên trình duyệt thật chưa được xác minh end-to-end. Nên kiểm tra trực tiếp trên Chrome/Safari/iPhone trước khi ra mắt.

## Bản cập nhật 1.1 — Sửa lệch bố cục thiệp (16/10/2026)

- **Sửa tận gốc lỗi lệch tâm:** nút nhạc trước đây `float:right` làm `.cover` co ngang so với màn hình điện thoại. Nút nay dùng `position:absolute`, không chiếm diện tích bố cục.
- Tên cô dâu, chú rể và tiêu đề sử dụng cỡ chữ theo **độ rộng container** (`cqw`), có giới hạn tối thiểu/tối đa và xuống dòng cân đối.
- Căn lại vùng an toàn, khung viền, dấu Song Hỷ, thông tin giờ/ngày và lời mời; phần cuộn giữ khoảng cách với đoạn nội dung cuối.
- Điều chỉnh cả ba mẫu Hồng Hỷ, Ngọc Uyển, Hoa Vân và ba lựa chọn font.
- Đã chạy 63 tổ hợp kích thước/tema/font (320, 360, 375, 390, 414, 768, 1440 px), tên dài, và kiểm thử API lưu 30 ngày + RSVP. Phép thử bố cục ở môi trường không tải Google Fonts nên nên kiểm tra thêm bằng trình duyệt có Internet trước khi phát hành công khai.

**Cập nhật dự án đang chạy:** Sao lưu bản cũ, giải nén ZIP mới và thay thư mục `public` cùng `README.md`; giữ nguyên thư mục `data/` (nếu đã tạo thiệp thực tế) để bảo toàn dữ liệu. Không ghi đè dữ liệu thiệp đã lưu.

Web prototype lấy cảm hứng từ mỹ thuật **Tân Trung Hoa (新中式)**, **thiết kế nguyên bản**, không sao chép mẫu hoặc tài sản có bản quyền.

## Chạy ứng dụng

Yêu cầu Node.js >= 22. Không cần `npm install`.

```bash
node server.js
```

Mở **http://localhost:4177/**. Sửa nội dung, chọn mẫu và nhạc, sau đó bấm **Lưu thiệp & tạo liên kết chia sẻ**. Để thiết bị khác truy cập, cần triển khai máy chủ và sử dụng tên miền HTTPS công khai.

### Tính năng đã thực thi

- Ba chủ đề Hồng Hỷ, Ngọc Uyển, Hoa Vân; họa tiết Song Hỷ (囍), đường nét hoa cổ, bố cục dọc cho điện thoại.
- Chỉnh cô dâu/chú rể, ngày giờ, nơi tổ chức, khách mời, lời mời, kiểu chữ và ảnh cưới.
- 4 bản phối mới MP3 + 2 nhạc cổ điển có ghi nguồn (phát trực tuyến) + 3 bản cũ (tương thích) + bài MP3 tự tải + chế độ không nhạc. Có nghe thử, tạm dừng, âm lượng, lưu lựa chọn theo thiệp. Không ép tự phát khi mở web.
- Phong bì đóng/mở, cuộn xem chuyện tình và địa điểm, đếm ngược ngày cưới, biểu mẫu RSVP/lời chúc.
- **Bản nháp trong trình duyệt** sử dụng localStorage, hết hạn tối đa 30 ngày tính từ lần đầu tạo. Bản nháp chỉ có trên thiết bị/trình duyệt đó.
- **Bản thiệp chia sẻ qua API**: POST `/api/cards`, GET `/api/cards/:id`, PUT `/api/cards/:id` bằng edit token. Link `/?card=<uuid>` để khách xem từ thiết bị khác. Sau khi lưu, URL người tạo đổi thành `/?edit=<uuid>` để tiếp tục sửa **trên cùng trình duyệt** (quyền sửa nằm trong localStorage, không gửi cho khách).
- RSVP lưu tại POST `/api/cards/:id/rsvp`, chủ thiệp đọc tại GET `/api/cards/:id/rsvps` bằng edit token.
- **Thiệp có TTL 30 ngày cố định** kể từ lần đầu tạo, cập nhật nội dung không gia hạn. Hết hạn trả HTTP 410, xóa file khi truy cập hoặc qua tác vụ dọn mỗi giờ. Dữ liệu RSVP bị xóa cùng thiệp.

### Cần làm trước khi sử dụng công khai hoặc kinh doanh

Máy chủ hiện dùng JSON file ở `./data/` (hoặc `DATA_DIR`) để vận hành và kiểm chứng chức năng. **Không triển khai trực tiếp lên Vercel Serverless** vì hệ thống file không bền vững. Sử dụng container với persistent disk, hoặc đổi sang PostgreSQL/Supabase trước khi scale.

Yêu cầu production: đăng nhập/chứng thực sở hữu thiệp; database RLS, giới hạn dung lượng/quota theo tài khoản; object storage cho ảnh/nhạc tùy chỉnh; quét file tải lên; CAPTCHA/chống spam RSVP; chuẩn hóa và lọc thông tin cá nhân; trang quyền riêng tư và đồng ý nhận phản hồi; monitor tác vụ xóa sau 30 ngày; sao lưu tuân thủ TTL; HTTPS, CSP và rate limit tại edge. `editToken` chỉ trả về lúc tạo thiệp, không chứa trong link chia sẻ, và phải lưu bảo mật.

### Quyền nhạc / font

Bốn bản MP3 mới là phối khí tự tạo bằng nhạc cụ ảo; ba WAV cũ được giữ để tương thích. Hai bản cổ điển phát trực tuyến phải giữ thông tin ghi công CC BY 3.0. Nhạc người dùng tải lên phải có quyền sử dụng. Font web dùng dịch vụ Google Fonts có thể cần kết nối Internet, với fallback font hệ thống. Kiểm tra giấy phép font nếu chọn font khác.

### Kiểm thử nhanh API

```bash
curl http://localhost:4177/api/health
# Dùng UI để tạo thiệp, sau đó mở link /?card=<id> trên trình duyệt khác.
```

Tập trung vào demo chức năng, không coi đây là sản phẩm thương mại đã kiểm toán bảo mật.
