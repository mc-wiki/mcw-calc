import { TextChildren, TextComponentFormat, TextContent, TextStyle } from './format'

class TextComponent {
  content: TextContent
  children: TextChildren
  style: TextStyle
  get data(): TextComponentFormat {
    return {
      ...this.content,
      ...this.children,
      ...this.style,
    }
  }

  constructor() {}
}
