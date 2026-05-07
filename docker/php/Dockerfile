FROM php:8.4-cli

# Instalar paquetes necesarios
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    ffmpeg \
    redis-tools \
    libzip-dev \
    zip \
    npm \
    && docker-php-ext-install zip \
    && pecl install redis \
    && docker-php-ext-enable redis

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

CMD ["bash"]
