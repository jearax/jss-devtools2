# The site image carries the bundle CI already tested, so the server never builds anything.
FROM nginx:1.30.6-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/home.html /usr/share/nginx/html/index.html
COPY scripts/install.sh /usr/share/nginx/html/install.sh
COPY release/cli.mjs /usr/share/nginx/html/releases/latest/cli.mjs
COPY release/checksums.txt /usr/share/nginx/html/releases/latest/checksums.txt

RUN nginx -t

EXPOSE 80
