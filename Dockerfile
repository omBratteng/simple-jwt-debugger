FROM gcr.io/distroless/nodejs:18
COPY index.mjs /

EXPOSE 3000
CMD ["/index.mjs"]
