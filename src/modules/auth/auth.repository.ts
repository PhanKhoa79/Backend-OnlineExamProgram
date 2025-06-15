import { Repository, DataSource } from 'typeorm';
import { Accounts } from '../../database/entities/Accounts';
import { Injectable } from '@nestjs/common';
import { RefreshToken } from 'src/database/entities/RefreshToken';
import { BlacklistToken } from 'src/database/entities/BlacklistToken';

@Injectable()
export class AuthRepository extends Repository<Accounts> {
  constructor(private dataSource: DataSource) {
    super(Accounts, dataSource.createEntityManager());
  }

  refreshTokenRepo = () => this.dataSource.getRepository(RefreshToken);
  blacklistTokenRepo = () => this.dataSource.getRepository(BlacklistToken);

  async saveRefreshToken(accountId: number, token: string, expiresAt: Date) {
    const repo = this.refreshTokenRepo();
    const newToken = repo.create({
      token,
      expiresAt,
      account: { id: accountId },
    });
    return await repo.save(newToken);
  }

  async removeRefreshToken(token: string) {
    const repo = this.refreshTokenRepo();
    await repo.delete({ token });
  }

  async getRefreshToken(token: string) {
    return await this.refreshTokenRepo().findOne({
      where: { token },
      relations: ['account'],
    });
  }

  async blacklistAccessToken(token: string, expiredAt: Date) {
    const repo = this.blacklistTokenRepo();
    await repo.save({ token, expiredAt });
  }

  async isAccessTokenBlacklisted(token: string) {
    const repo = this.blacklistTokenRepo();
    return await repo.findOne({ where: { token } });
  }

  async deleteExpiredRefreshTokens(now: Date) {
    await this.refreshTokenRepo()
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expiresAt < :now', { now })
      .execute();
  }

  async findByActivationToken(token: string): Promise<Accounts | null> {
    return this.findOne({
      where: { activationToken: token },
      relations: ['role'],
    });
  }
}
