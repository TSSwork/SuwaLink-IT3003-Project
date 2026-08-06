# --- build stage -------------------------------------------------------------
# Uses the Maven wrapper already in the repo, so the image needs no Maven install.
FROM eclipse-temurin:26-jdk AS build

WORKDIR /build

# Copy the wrapper + pom first so dependency resolution is cached as its own
# layer and only re-runs when pom.xml actually changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -DskipTests package \
    && cp target/*.jar /build/app.jar

# --- runtime stage -----------------------------------------------------------
FROM eclipse-temurin:26-jdk AS runtime

WORKDIR /app

# Run as a non-root user; it needs to own /app/uploads to write image files.
RUN useradd --system --create-home --uid 1001 suwalink \
    && mkdir -p /app/uploads \
    && chown -R suwalink:suwalink /app

COPY --from=build --chown=suwalink:suwalink /build/app.jar /app/app.jar

USER suwalink

EXPOSE 8080

# Container memory, not the host's, decides the heap size.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"

# Tomcat only binds 8080 once startup finished, so an open port means "ready".
HEALTHCHECK --interval=10s --timeout=5s --retries=12 --start-period=60s \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080' || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
