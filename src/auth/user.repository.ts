import { EntityRepository, Repository } from 'typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {
    const { username, password } = authCredentialsDto;
    const user = new User();
    user.username = username;
    user.password = await this.encryptPassword(password);

    try {
      await user.save();
    } catch (e) {
      if (e.code === '23505') {
        // duplicate username
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  async validateUserPassword(
    authCredentialsDto: AuthCredentialsDto,
  ): Promise<string> {
    const { username, password } = authCredentialsDto;
    const user = await this.findOne({ username });
    if (user && (await user.validatePassword(password))) {
      return user.username;
    } else return null;
  }

  private async encryptPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2i,
        memoryCost: 2 ** 16,
        hashLength: 32,
      });
    } catch (e) {
      throw new InternalServerErrorException('Could not hash password');
    }
  }
}
