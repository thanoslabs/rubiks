# Static Rubik's cube app served by unprivileged nginx (runs as non-root, listens on 8080).
FROM nginxinc/nginx-unprivileged:1.31.7-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# .inc, not .conf, so nginx's conf.d/*.conf glob doesn't load it at http level.
COPY nginx/security-headers.conf /etc/nginx/conf.d/security-headers.inc
COPY app/ /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
