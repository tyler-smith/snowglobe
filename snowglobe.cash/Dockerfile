FROM alpine3.6
RUN wget https://caddyserver.com/download/linux/amd64?plugins=http.cors,http.gopkg,http.grpc&license=personal&telemetry=off
RUN mv ./amd64 /opt/caddy
CMD ["caddy"]
