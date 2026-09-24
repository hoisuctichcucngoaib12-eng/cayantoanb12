# Cây Lời Nhắn — phiên bản 2

Một website nhỏ để gửi và xem lại lời nhắn dưới dạng một cái cây. Mỗi lời nhắn trở thành một chiếc lá có màu sắc tự nhiên khác nhau.

## Điểm mới
- Cây cổ thụ SVG nhiều lớp: thân, cành lớn, cành nhỏ, rễ và vân gỗ.
- 9 nhóm màu lá: xanh non, xanh lá, xanh vàng, ô-liu, vàng, hổ phách, cam đỏ, lá khô và nâu.
- 4 biến thể hình dáng lá và hệ gân lá bằng SVG.
- Lá được bố trí theo dáng cành để nhìn tự nhiên hơn.
- Vẫn giữ thao tác đơn giản: viết lời nhắn → thả chiếc lá → click lá để đọc.
- Netlify Function + Netlify Blobs để dùng chung dữ liệu trên website. Netlify Blobs hỗ trợ lưu dữ liệu dạng key/value và `setJSON()`/`get(..., { type: "json" })`. 

## Deploy lên Netlify

1. Đưa toàn bộ thư mục `message-tree` lên GitHub.
2. Trong Netlify chọn **Add new project → Import an existing project**.
3. Chọn repository và deploy.
4. `netlify.toml` đã cấu hình publish directory và functions directory.

Netlify Functions dùng file `.mjs` trong `netlify/functions/` với default handler nhận `Request` và trả về `Response`.

