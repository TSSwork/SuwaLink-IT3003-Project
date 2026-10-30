# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /build

# Wrapper and pom first so the dependency layer is cached between source changes
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package && cp target/suwalink-*.jar /build/app.jar

# ---- Run stage ----
FROM eclipse-temurin:25-jre

# curl is used by the healthcheck; the JRE image does not ship it
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 --user-group suwalink

WORKDIR /app
COPY --from=build /build/app.jar /app/app.jar
RUN mkdir -p /app/uploads && chown suwalink:suwalink /app/uploads

ENV TZ=Asia/Colombo SPRING_PROFILES_ACTIVE=prod UPLOAD_DIR=/app/uploads

USER suwalink
VOLUME /app/uploads
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","/app/app.jar"]
