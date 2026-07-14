import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Res, Header } from '@nestjs/common';
import { FeedsService } from './feeds.service';
import { CreateFeedSchema, UpdateFeedSchema } from './dto/create-feed.dto';
import type { Request, Response } from 'express';

@Controller('feeds')
export class FeedsController {
  constructor(private feeds: FeedsService) {}

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.findOne(id, userId);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateFeedSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.create(userId, input);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateFeedSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.update(id, userId, input);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.delete(id, userId);
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.enqueueRefresh(id, userId);
  }

  @Get('export/opml')
  @Header('Content-Type', 'text/xml; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="folio-subscriptions.opml"')
  async exportOPML(@Req() req: Request, @Res() res: Response) {
    const userId = (req as { user: { id: string } }).user?.id;
    const opmlXml = await this.feeds.exportToOPML(userId);
    return res.send(opmlXml);
  }

  @Post('import/opml')
  async importOPML(@Body() body: { opml: string }, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.feeds.importFromOPML(userId, body.opml);
  }
}