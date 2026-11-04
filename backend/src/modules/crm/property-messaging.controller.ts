import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { CreateVisitorSessionDto } from './dto/create-visitor-session.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendPropertyMessageDto } from './dto/send-property-message.dto';
import { PropertyMessagingService } from './property-messaging.service';

type Requester = { id: string; role: string };

@Controller('messages')
export class PropertyMessagingController {
  constructor(
    private readonly messagingService: PropertyMessagingService,
  ) {}

  @Public()
  @Post('visitor-session')
  createVisitorSession(
    @Body() dto: CreateVisitorSessionDto,
    @Req() request: Request,
  ) {
    return this.messagingService.createVisitorSession(
      dto.propertyId,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Public()
  @Post('properties/:propertyId/conversation')
  startVisitorConversation(
    @Param('propertyId', ParseObjectIdPipe) propertyId: string,
    @Headers('x-visitor-session') sessionToken: string,
    @Body() dto: StartConversationDto,
    @Req() request: Request,
  ) {
    return this.messagingService.startVisitorConversation(
      propertyId,
      sessionToken,
      dto,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Public()
  @Get('visitor/conversations/:conversationId')
  getVisitorConversation(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Headers('x-visitor-session') sessionToken: string,
    @Req() request: Request,
  ) {
    return this.messagingService.getVisitorConversation(
      conversationId,
      sessionToken,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Public()
  @Get('visitor/conversations/:conversationId/messages')
  async getVisitorMessages(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Headers('x-visitor-session') sessionToken: string,
    @Req() request: Request,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const visitorSession =
      await this.messagingService.validateVisitorSession(sessionToken);
    return this.messagingService.getMessages(
      conversationId,
      { id: '', role: 'visitor' },
      visitorSession,
      before,
      limit,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @Public()
  @Post('visitor/conversations/:conversationId/messages')
  sendVisitorMessage(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @Headers('x-visitor-session') sessionToken: string,
    @Body() dto: SendPropertyMessageDto,
    @Req() request: Request,
  ) {
    return this.messagingService.sendVisitorMessage(
      conversationId,
      sessionToken,
      dto,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  @Get('agent/unread-count')
  async getAgentUnreadCount(@CurrentUser('id') agentId: string) {
    const count = await this.messagingService.getAgentUnreadCount(agentId);
    return { count };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  @Get('agent/conversations')
  getAgentConversations(
    @CurrentUser('id') agentId: string,
    @Query('q') query?: string,
  ) {
    return this.messagingService.getAgentConversations(agentId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  @Get('agent/conversations/:conversationId')
  getAgentConversation(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @CurrentUser() requester: Requester,
  ) {
    return this.messagingService.getAgentConversation(conversationId, requester);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  @Get('agent/conversations/:conversationId/messages')
  getAgentMessages(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @CurrentUser() requester: Requester,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      conversationId,
      requester,
      undefined,
      before,
      limit,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT)
  @Post('agent/conversations/:conversationId/messages')
  sendAgentMessage(
    @Param('conversationId', ParseObjectIdPipe) conversationId: string,
    @CurrentUser() requester: Requester,
    @Body() dto: SendPropertyMessageDto,
  ) {
    return this.messagingService.sendAgentMessage(
      conversationId,
      requester,
      dto,
    );
  }
}
