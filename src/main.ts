import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const consoleUrl = config.get<string>('CONSOLE_URL', 'http://localhost:3000');

  app.enableCors({
    origin: [consoleUrl, 'http://localhost:3000'],
    credentials: true,
  });

  await app.listen(port);
}
bootstrap();
