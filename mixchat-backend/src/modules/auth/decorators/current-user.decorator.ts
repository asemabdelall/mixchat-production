import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDto } from '../dto/auth-response.dto';

export interface AuthenticatedUser extends UserDto {
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
