# MinIO CORS Setup

Run these commands on the VPS after MinIO is running.

## 1. Configure mc alias

```bash
mc alias set myminio https://minio.yourserver.com ACCESSKEY SECRETKEY
```

## 2. Set bucket to allow public downloads

```bash
mc anonymous set download myminio/nejemeyek
```

## 3. Create cors.json

```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT"],
  "AllowedOrigins": ["https://nejemeyekjogja.com", "http://localhost:4321"],
  "ExposeHeaders": ["ETag"]
}]
```

## 4. Apply CORS policy

```bash
mc cors set myminio/nejemeyek cors.json
```
