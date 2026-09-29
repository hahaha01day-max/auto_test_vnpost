# 🔴 GHIM ĐÚNG version khớp `devDependencies` (@playwright/test 1.59.1).
#    Lệch version giữa image và package.json sinh lỗi rất khó hiểu: trình duyệt trong image
#    không khớp protocol mà thư viện mong đợi, lỗi báo ra lại là "test fail".
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# better-sqlite3 cần toolchain lúc cài; cài trước, cache riêng lớp này.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY tool ./tool
COPY tai-lieu-test ./tai-lieu-test
COPY playwright.dynamic.config.js ./

# 🔴 tool-data là VOLUME: chứa DB, hồ sơ môi trường và toàn bộ lịch sử chạy.
#    Không mount volume là mỗi lần deploy lại mất sạch.
ENV TOOL_DATA_DIR=/data
VOLUME ["/data"]

# Image Playwright có sẵn user `pwuser` — không chạy bằng root.
RUN mkdir -p /data && chown -R pwuser:pwuser /app /data
USER pwuser

ENV TOOL_PORT=4100
EXPOSE 4100

CMD ["node", "tool/server.js"]
