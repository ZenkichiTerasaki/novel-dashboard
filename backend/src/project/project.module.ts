import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectPermissionService } from './project-permission.service';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ProjectController],
  providers: [ProjectService, ProjectPermissionService],
    exports: [ProjectPermissionService,],
})
export class ProjectModule {}