import React from 'react';
import { Button, Popover, PopoverBody, PopoverTrigger, BlockText } from 'nr1';
import { Divider } from 'semantic-ui-react';

export default class SummaryBar extends React.PureComponent {
  render() {
    const { costTotals } = this.props;
    return (
      <>
        <br />
        <Button
          style={{ cursor: 'text' }}
          type={Button.TYPE.OUTLINE}
          sizeType={Button.SIZE_TYPE.SMALL}
        >
          Total: ${costTotals.data + costTotals.rate + costTotals.period}
        </Button>
        &nbsp;
        <Popover openOnHover>
          <PopoverTrigger>
            <Button
              style={{ cursor: 'text' }}
              type={Button.TYPE.OUTLINE}
              sizeType={Button.SIZE_TYPE.SMALL}
            >
              Data: ${costTotals.data}
            </Button>
          </PopoverTrigger>
          <PopoverBody>
            <BlockText style={{ padding: '5px' }}>
              Total of data based costs eg. 100GB
            </BlockText>
          </PopoverBody>
        </Popover>
        &nbsp;
        <Popover openOnHover>
          <PopoverTrigger>
            <Button
              style={{ cursor: 'text' }}
              type={Button.TYPE.OUTLINE}
              sizeType={Button.SIZE_TYPE.SMALL}
            >
              Period: ${costTotals.period}
            </Button>
          </PopoverTrigger>
          <PopoverBody>
            <BlockText style={{ padding: '5px' }}>
              Total of period based costs eg. EC2 monthly running cost
            </BlockText>
          </PopoverBody>
        </Popover>
        &nbsp;
        <Popover openOnHover>
          <PopoverTrigger>
            <Button
              style={{ cursor: 'text' }}
              type={Button.TYPE.OUTLINE}
              sizeType={Button.SIZE_TYPE.SMALL}
            >
              Rate: ${costTotals.rate}
            </Button>
          </PopoverTrigger>
          <PopoverBody>
            <BlockText style={{ padding: '5px' }}>
              Total of request based actions eg. 100 messages or requests
            </BlockText>
          </PopoverBody>
        </Popover>
        &nbsp;
        <Divider />
      </>
    );
  }
}
