# The frontend is plain static HTML/CSS/ES-modules, so nginx is all it needs.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

# nginx.conf/Dockerfile aren't web assets — don't serve them.
RUN rm -f /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore

EXPOSE 80
