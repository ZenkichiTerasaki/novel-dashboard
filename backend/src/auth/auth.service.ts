import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    //1.ユーザ情報の取得
    const user = await this.userService.findByEmail(email);

    //er1.ユーザが存在しない場合
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    //2.パスワードとハッシュ値を比較
    const isMatch = await bcrypt.compare(password, user.password);

    //er2.パスワードが間違っている場合
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    //トークン取得用変数
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}