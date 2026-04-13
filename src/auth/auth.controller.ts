import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentDeveloper } from './decorators/current-developer.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; name: string }) {
    return this.authService.register(body.email, body.password, body.name);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(req.user as any);
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
    return { accessToken: result.accessToken, developer: result.developer };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (!token) {
      return { error: 'No refresh token provided' };
    }
    const result = await this.authService.refresh(token);
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
    return { accessToken: result.accessToken, developer: result.developer };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { message: 'Logged out' };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.login(req.user as any);
    const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:3000';
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
    res.redirect(`${consoleUrl}/auth/callback?token=${result.accessToken}`);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Passport redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.login(req.user as any);
    const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:3000';
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });
    res.redirect(`${consoleUrl}/auth/callback?token=${result.accessToken}`);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentDeveloper() dev: { id: string }) {
    return this.authService.getProfile(dev.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentDeveloper() dev: { id: string },
    @Body() body: { name?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(dev.id, body);
  }
}
