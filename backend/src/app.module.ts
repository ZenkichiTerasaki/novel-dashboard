import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './project/project.module';
import { ScenarioModule } from './scenario/scenario.module';
import { EventModule } from './event/event.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
     ProjectModule,
      ScenarioModule,
       EventModule,
        UserModule,
         AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
