/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/chatbot/common-chat-response.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UIChatResponseService {
  protected appName: string;

  constructor() {}

  protected getTextResponseComponent(text: string[] = []): any {
    return {
      text: {
        text,
      },
    };
  }

  protected getInfoResponseComponent(
    title: string = '',
    subtitle: string | string[] = '',
    imageUrl: string = '',
    actionLink: string = '',
  ): any {
    return {
      type: 'info',
      title,
      subtitle,
      image: {
        src: {
          rawUrl: imageUrl,
        },
      },
      actionLink,
    };
  }

  protected getDescriptionResponseComponent(
    title: string = '',
    text: string[] = [],
  ): any {
    return {
      type: 'description',
      title,
      text,
    };
  }

  protected getImageResponseComponent(
    imageUrl: string = '',
    accessibilityText: string = '',
  ): any {
    return {
      type: 'image',
      rawUrl: imageUrl,
      accessibilityText,
    };
  }

  protected getButtonResponseComponent(
    text: string = '',
    link: string = '',
    iconType: string = '',
    iconColor: string = '',
    event: Record<string, any> = {},
  ): any {
    return {
      type: 'button',
      icon: {
        type: iconType,
        color: iconColor,
      },
      text,
      link,
      event,
    };
  }

  protected getDividerResponseComponent(): any {
    return {
      type: 'divider',
    };
  }

  protected getListItemResponseComponent(
    title: string = '',
    subtitle: string = '',
    event: Record<string, any> = {},
  ): any {
    return {
      type: 'list',
      title,
      subtitle,
      event,
    };
  }

  protected getAccordionResponseComponent(
    title: string = '',
    subtitle: string = '',
    imageUrl: string = '',
    text: string = '',
  ): any {
    return {
      type: 'accordion',
      title,
      subtitle,
      image: {
        src: {
          rawUrl: imageUrl,
        },
      },
      text,
    };
  }

  protected getSuggestionChipResponseComponent(options: any[] = []): any {
    const formattedOptions = options.map((item) => ({
      text: item.text || '',
      link: item.link || '',
      image: {
        src: {
          rawUrl: item.icon_url || '',
        },
      },
    }));
    return {
      type: 'chips',
      options: formattedOptions,
    };
  }

  public getErrorIntentResponse(errorMessage: string | null = null): any {
    const message = errorMessage || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    return {
      fulfillmentMessages: [this.getTextResponseComponent([message])],
    };
  }
}
