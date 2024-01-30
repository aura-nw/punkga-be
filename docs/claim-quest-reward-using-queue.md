# Claim quest reward using queue

1. Overview

- Vấn đề hiện có: Khi cùng lúc claim reward nhiều lần => quá số lượng slot reward/quest
- Cách xử lý: Dùng queue
- Một số vấn đề gặp phải: Báo log cho user như thế nào khi xảy ra lỗi ở job. Khắc phục: tạo bảng request trong db, mỗi khi có request claim sẽ lưu 1 request processing vào db. Job thực hiện xong sẽ update vào db. Client dùng subscription vào hasura để lấy request status

2. Chi tiết

- Thêm bảng mới: `RequestLog`

  ![Alt text](image-3.png)

- Thêm cột `request_id` cho các bảng reward

  ![Alt text](image-4.png)

  ![Alt text](image-5.png)

3. Sequence diagram

- Request claim reward

  ![Alt text](image-6.png)

- Job processing

  ![Alt text](image-7.png)

- FE get claim status

  ![Alt text](image-8.png)
