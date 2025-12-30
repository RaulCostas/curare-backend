import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log('Force Restart Triggered: ' + new Date().toISOString());
}
bootstrap();
