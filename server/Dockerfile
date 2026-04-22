FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY server/ ./server/
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/jellycord-server ./server/cmd/jellycord-server

FROM alpine:3.20
RUN adduser -D -u 10001 app
USER app
WORKDIR /app
COPY --from=build /out/jellycord-server /app/jellycord-server
EXPOSE 8080
ENV JELLYCORD_ADDR=:8080
CMD ["/app/jellycord-server"]

