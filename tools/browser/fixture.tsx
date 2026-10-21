import { Profiler, useRef, useState, type AnimationEvent as ReactAnimationEvent, type ChangeEvent, type CSSProperties, type FocusEvent, type MouseEvent as ReactMouseEvent, type SVGProps } from 'react';

import { Button } from '../../src/components/Button/Button';
import { Accordion, AccordionItem } from '../../src/components/Accordion';
import { Box } from '../../src/components/Box/Box';
import { ChoiceButtons } from '../../src/components/ChoiceButtons/ChoiceButtons';
import { CollapseWrap } from '../../src/components/Collapse/CollapseWrap';
import { CollapseControlsFixture } from './collapse-controls.fixture';
import { TextTimelineFixture } from './text-timeline.fixture';
import { Grid, GridItem } from '../../src/components/Grid/Grid';
import { GradientBorder } from '../../src/components/GradientBorder';
import type { createSmoothScroll } from '../../src/components/SmoothScroll/engine';
import { Flex } from '../../src/components/Flex/Flex';
import { MediaDropDown } from '../../src/components/MediaDropDown/MediaDropDown';
import { Img } from '../../src/components/Img/Img';
import { Input } from '../../src/components/Input/Input';
import { Icon } from '../../src/components/Icon/Icon';
import { Carousel } from '../../src/components/Carousel/Carousel';
import { CarouselNav } from '../../src/components/Carousel/CarouselNav/CarouselNav';
import { Dropdown } from '../../src/components/Dropdown/Dropdown';
import { Modal } from '../../src/components/Modal/Modal';
import { ModalProvider, useModal } from '../../src/components/Modal/ModalProvider';
import { LexicalText } from '../../src/components/RichText/RichText';
import { PhoneField } from '../../src/components/PhoneField/PhoneField';
import { Select } from '../../src/components/Select/Select';
import { Text } from '../../src/components/Text/Text';
import { Section } from '../../src/components/Section';
import { Textarea } from '../../src/components/Textarea/Textarea';
import { RefactorContractsFixture } from './refactor-contracts.fixture';
import { ScrollAreaFixture } from './scroll-area.fixture';
import { InteractionScopeFixture } from './interaction-scope.fixture';
import { VideoPlayer } from '../../src/components/VideoPlayer/VideoPlayer';
import { Checkbox } from '../../src/components/Checkbox/Checkbox';
import { Radio } from '../../src/components/Radio/Radio';
import { SwitchButton } from '../../src/components/SwitchButton/SwitchButton';
import type { CollapseHandle } from '../../src/hooks/useCollapseMotion';

type FieldEvent =
  | ChangeEvent<HTMLInputElement>
  | ChangeEvent<HTMLTextAreaElement>
  | FocusEvent<HTMLInputElement>
  | FocusEvent<HTMLTextAreaElement>;

type FieldLog = {
  reason: string;
  value: string;
  eventType: string | null;
  eventValue: string | null;
  targetIsControl: boolean;
  trusted: boolean | null;
  pairedWithDomEvent: boolean;
};

declare global {
  interface Window {
    __createSmoothScroll: typeof createSmoothScroll;
    __fieldLogs: Record<string, FieldLog[]>;
    __lastChange: Record<string, ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | undefined>;
    __focusLogs: Record<string, { type: string; targetIsControl: boolean; trusted: boolean }>;
    __buttonNode: HTMLButtonElement | null;
    __collapseNode: HTMLElement | null;
    __collapseHandle: CollapseHandle | null;
    __collapseTransitions: number;
    __collapseEnds: number;
    __phoneEvents: { model: string; domValue: string; trusted: boolean }[];
    __phoneValues: string[];
    __resetValueChanges: number;
    __numberChanges: number;
    __motionEvents: Record<string, string[]>;
    __imageMotionTargets: string[];
    __imageClickTargets: string[];
    __imageRoot: HTMLElement | null;
    __iconEvents: { type: string; currentTarget: string; trusted: boolean }[];
    __iconSvg: SVGSVGElement | null;
    __setIconTooltip: ((value: string | undefined) => void) | null;
    __swapEvents: Record<string, { target: string; name: string }[]>;
    __swapStarts: Record<string, { name: string; text: string | null }[]>;
    __swapNodes: Record<string, HTMLElement | null>;
    __setSwapKey: ((value: string) => void) | null;
    __setLexicalText: ((value: string) => void) | null;
    __setCarouselEffect: ((value: 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip') => void) | null;
    __videoTime: number;
    __videoSeeks: number[];
    __profileSamples: { phase: string; actualDuration: number; baseDuration: number }[];
    __phoneProfileSamples: number[];
    __phoneCountryOptionCount: number;
    __motionProfileSamples: { phase: string; actualDuration: number; baseDuration: number }[];
    __setMotionProfileEnabled: ((value: boolean) => void) | null;
    __setMotionProfileText: ((value: string) => void) | null;
    __modalSelectChanges: string[];
    __setMediaDisabled: ((value: boolean) => void) | null;
    __disabledLinkClicks: number;
  }
}

const initWindowState = () => {
  window.__fieldLogs = {};
  window.__lastChange = {};
  window.__focusLogs = {};
  window.__buttonNode = null;
  window.__collapseNode = null;
  window.__collapseHandle = null;
  window.__collapseTransitions = 0;
  window.__collapseEnds = 0;
  window.__phoneEvents = [];
  window.__phoneValues = [];
  window.__resetValueChanges = 0;
  window.__numberChanges = 0;
  window.__motionEvents = {};
  window.__imageMotionTargets = [];
  window.__imageClickTargets = [];
  window.__imageRoot = null;
  window.__iconEvents = [];
  window.__iconSvg = null;
  window.__setIconTooltip = null;
  window.__swapEvents = {};
  window.__swapStarts = {};
  window.__swapNodes = {};
  window.__setSwapKey = null;
  window.__setLexicalText = null;
  window.__setCarouselEffect = null;
  window.__videoTime = 0;
  window.__videoSeeks = [];
  window.__profileSamples = [];
  window.__phoneProfileSamples = [];
  window.__phoneCountryOptionCount = 0;
  window.__motionProfileSamples = [];
  window.__setMotionProfileEnabled = null;
  window.__setMotionProfileText = null;
  window.__modalSelectChanges = [];
  window.__setMediaDisabled = null;
  window.__disabledLinkClicks = 0;
};

function recordChange<E extends HTMLInputElement | HTMLTextAreaElement>(key: string, event: ChangeEvent<E>) {
  window.__lastChange[key] = event;
}

function recordValueChange(
  key: string,
  control: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  details: { reason: string; event: FieldEvent | null },
) {
  const event = details.event;
  const log: FieldLog = {
    reason: details.reason,
    value,
    eventType: event?.type ?? null,
    eventValue: event ? (event.target as HTMLInputElement | HTMLTextAreaElement).value : null,
    targetIsControl: Boolean(control && event?.target === control),
    trusted: event?.nativeEvent.isTrusted ?? null,
    pairedWithDomEvent: event?.type === 'change' && event === window.__lastChange[key],
  };
  window.__fieldLogs[key] = [...(window.__fieldLogs[key] ?? []), log];
  const output = document.querySelector<HTMLOutputElement>(`[data-log="${key}"]`);
  if (output) output.value = JSON.stringify(window.__fieldLogs[key]);
}

function ContractFields() {
  const [plainValue, setPlainValue] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [seedValue, setSeedValue] = useState('0');
  const [internationalPhone, setInternationalPhone] = useState('');
  const plainRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const seedRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-label="Field event contracts" className="fixture">
      <Input
        ref={plainRef}
        aria-label="Plain value field"
        data-testid="plain-value"
        value={plainValue}
        onChange={(event) => {
          recordChange('plain', event);
          setPlainValue(event.target.value);
        }}
        onValueChange={(value, details) => {
          setPlainValue(value);
          recordValueChange('plain', plainRef.current, value, details);
        }}
      />
      <output className="log" data-log="plain" />

      <Input
        ref={phoneRef}
        aria-label="Phone value field"
        data-testid="phone-value"
        type="tel"
        value={phoneValue}
        onChange={(event) => recordChange('phone', event)}
        onValueChange={(value, details) => {
          setPhoneValue(value);
          recordValueChange('phone', phoneRef.current, value, details);
        }}
      />
      <output className="log" data-log="phone" />

      <PhoneField
        aria-label="International phone field"
        data-testid="phone-field"
        form="phone-form"
        name="international"
        label="International phone"
        locale="en"
        error="Check this phone number"
        country={{ countries: ['RU', 'US', 'CA'], default: 'RU' }}
        value={internationalPhone}
        onChange={(event) => window.__phoneEvents.push({
          model: internationalPhone,
          domValue: event.target.value,
          trusted: event.nativeEvent.isTrusted,
        })}
        onValueChange={(value) => { setInternationalPhone(value); window.__phoneValues.push(value); }}
      />
      <form id="phone-form" data-testid="phone-form" />

      <Textarea
        ref={textareaRef}
        aria-label="Textarea value field"
        data-testid="textarea-value"
        value={textareaValue}
        onChange={(event) => {
          recordChange('textarea', event);
          setTextareaValue(event.target.value);
        }}
        onValueChange={(value, details) => {
          setTextareaValue(value);
          recordValueChange('textarea', textareaRef.current, value, details);
        }}
      />
      <output className="log" data-log="textarea" />

      <Input
        ref={seedRef}
        aria-label="Seed value field"
        data-testid="seed-value"
        value={seedValue}
        seed="0"
        onChange={(event) => recordChange('seed', event)}
        onFocus={(event) => recordFocus('seed-focus', seedRef.current, event)}
        onBlur={(event) => recordFocus('seed-blur', seedRef.current, event)}
        onValueChange={(value, details) => {
          setSeedValue(value);
          recordValueChange('seed', seedRef.current, value, details);
        }}
      />
      <output className="log" data-log="seed" />
    </section>
  );
}

function PhoneFieldProfile() {
  const [value, setValue] = useState('');
  return (
    <Profiler id="phone-field-all-countries" onRender={(_id, _phase, actualDuration) => {
      window.__phoneProfileSamples = [...window.__phoneProfileSamples, actualDuration].slice(-20);
      window.__phoneCountryOptionCount = document.querySelectorAll('[aria-label="Страны"] button').length;
    }}>
      <PhoneField
        data-testid="profile-phone"
        aria-label="Profile phone field"
        country={{ countries: 'all', default: 'RU' }}
        value={value}
        onChange={() => undefined}
        onValueChange={setValue}
      />
    </Profiler>
  );
}

function MotionProfileField() {
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState('Profile text A');
  window.__setMotionProfileEnabled = setEnabled;
  window.__setMotionProfileText = setText;

  return (
    <section aria-label="Motion profiling observation" className="fixture">
      <button type="button" data-testid="motion-profile-toggle" onClick={() => setEnabled((current) => !current)}>
        Toggle motion profile
      </button>
      <button type="button" data-testid="motion-profile-update" onClick={() => setText((current) => current.endsWith('A') ? 'Profile text B' : 'Profile text A')}>
        Update profiled text
      </button>
      <Profiler id="motion-40-text-tree" onRender={(_id, phase, actualDuration, baseDuration) => {
        window.__motionProfileSamples = [...window.__motionProfileSamples, { phase, actualDuration, baseDuration }].slice(-20);
      }}>
        <Box
          data-testid="motion-profile-box"
          data-profile-mode={enabled ? 'motion' : 'static'}
          perspective3d={enabled ? 600 : undefined}
          reveal={enabled ? ['up', { duration: 0.1, fade: false }] : undefined}
        >
          {Array.from({ length: 40 }, (_, index) => <Text key={index}>{text} {index + 1}</Text>)}
        </Box>
      </Profiler>
    </section>
  );
}

function recordFocus(key: string, control: HTMLInputElement | null, event: FocusEvent<HTMLInputElement>) {
  window.__focusLogs[key] = {
    type: event.type,
    targetIsControl: Boolean(control && event.target === control),
    trusted: event.nativeEvent.isTrusted,
  };
}

function FormDataFields() {
  const [choice, setChoice] = useState<'first' | 'second'>('first');
  const [selected, setSelected] = useState<('alpha' | 'beta')[]>(['alpha']);
  const [topic, setTopic] = useState<'one' | 'two'>('one');
  const [showForm, setShowForm] = useState(true);
  const [cancelReset, setCancelReset] = useState(false);

  return (
    <section aria-label="Form data contracts" className="fixture">
      {showForm && (
        <form
          id="external-form"
          data-testid="external-form"
          onReset={(event) => { if (cancelReset) event.preventDefault(); }}
        >
          <button type="reset">Reset external fields</button>
        </form>
      )}
      <button type="button" onClick={() => setShowForm((current) => !current)}>Toggle external form</button>
      <Input form="external-form" name="shared" value={choice} onChange={() => undefined} aria-label="External native control" />
      <Input
        form="external-form"
        name="reset"
        data-testid="reset-field"
        defaultValue="initial"
        aria-label="Uncontrolled reset field"
        onValueChange={() => { window.__resetValueChanges += 1; }}
      />
      <Input
        form="external-form"
        name="cancel"
        data-testid="cancel-reset-field"
        defaultValue="initial"
        aria-label="Canceled reset field"
      />
      <Select
        form="external-form"
        aria-label="External multi select"
        name="shared"
        multiple
        options={[{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]}
        value={selected}
        onChange={setSelected}
      />
      <Select
        form="external-form"
        aria-label="Disabled select"
        name="shared"
        disabled
        options={[{ value: 'disabled', label: 'Disabled value' }]}
        value="disabled"
        onChange={() => undefined}
      />
      <ChoiceButtons
        form="external-form"
        name="topic"
        value={topic}
        onChange={(value) => setTopic(value)}
        items={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]}
      />
      <button type="button" onClick={() => setCancelReset((current) => !current)}>
        Toggle reset cancellation
      </button>
    </section>
  );
}

function NumberFields() {
  const [fraction, setFraction] = useState('0.2');
  const [any, setAny] = useState('1.25');
  const [locked, setLocked] = useState('2');

  return (
    <section aria-label="Number step contracts" className="fixture">
      <Input
        type="number"
        aria-label="Fractional min step"
        data-testid="fraction-step"
        value={fraction}
        min={0.2}
        step={0.5}
        onChange={() => undefined}
        onValueChange={(value) => { setFraction(value); window.__numberChanges += 1; }}
      />
      <Input
        type="number"
        aria-label="Any step"
        data-testid="any-step"
        value={any}
        step="any"
        onChange={() => undefined}
        onValueChange={(value) => { setAny(value); window.__numberChanges += 1; }}
      />
      <Input
        type="number"
        aria-label="Read only step"
        data-testid="readonly-step"
        value={locked}
        step={0.5}
        readOnly
        onChange={() => undefined}
        onValueChange={(value) => { setLocked(value); window.__numberChanges += 1; }}
      />
      <output data-testid="number-values">{`${fraction}|${any}|${locked}`}</output>
    </section>
  );
}

function CollapseField() {
  const [open, setOpen] = useState(false);
  const handleRef = useRef<CollapseHandle>(null);

  return (
    <section aria-label="Collapse contracts" className="fixture">
      <button type="button" onClick={() => setOpen((current) => !current)}>{open ? 'Close details' : 'Open details'}</button>
      <CollapseWrap
        open={open}
        gap={[8, 8, 8]}
        fade
        keepMounted
        handleRef={handleRef}
        onTransition={() => { window.__collapseTransitions += 1; }}
        onEnd={() => { window.__collapseEnds += 1; }}
      >
        <div ref={(node) => { window.__collapseNode = node; }}>
          <button type="button" data-testid="inside-collapse">Inside collapse</button>
        </div>
      </CollapseWrap>
      <output data-testid="collapse-state" />
      <button type="button" onClick={() => {
        window.__collapseHandle = handleRef.current;
        const state = document.querySelector<HTMLOutputElement>('[data-testid="collapse-state"]');
        if (state) state.value = JSON.stringify({
          node: Boolean(window.__collapseNode),
          handle: Boolean(window.__collapseHandle),
          transition: window.__collapseHandle?.transition.status,
          transitions: window.__collapseTransitions,
          ends: window.__collapseEnds,
        });
      }}>Read collapse refs</button>
    </section>
  );
}

function SearchableFlexField() {
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState(0);

  return (
    <section aria-label="Searchable flex contracts" className="fixture">
      <Flex
        data-testid="searchable-flex"
        collapse={{ open, keepMounted: true, onFound: () => { setFound((count) => count + 1); setOpen(true); } }}
      >
        <Input data-testid="searchable-flex-input" aria-label="Searchable flex input" />
      </Flex>
      <output data-testid="search-found-count">{found}</output>
    </section>
  );
}

function ButtonField() {
  const [tooltip, setTooltip] = useState('Tooltip one');
  return (
    <section aria-label="Button tooltip contracts" className="fixture">
      <Button
        ref={(node) => { window.__buttonNode = node instanceof HTMLButtonElement ? node : null; }}
        data-testid="tooltip-button"
        tooltip={tooltip}
        onClick={() => setTooltip('Tooltip two')}
      >
        Change tooltip
      </Button>
      <Button
        data-testid="disabled-internal-link"
        href="/local-destination"
        disabled
        onClick={() => { window.__disabledLinkClicks += 1; }}
      >Disabled internal link</Button>
      <Button
        data-testid="disabled-external-link"
        href="https://example.test/external-destination"
        disabled
        onClick={() => { window.__disabledLinkClicks += 1; }}
      >Disabled external link</Button>
      <output data-testid="button-ref" />
      <button type="button" onClick={() => {
        const output = document.querySelector<HTMLOutputElement>('[data-testid="button-ref"]');
        if (output) output.value = String(window.__buttonNode === document.querySelector('[data-testid="tooltip-button"]'));
      }}>Read button ref</button>
    </section>
  );
}

function MediaDropDownField() {
  const [type, setType] = useState<'image' | 'video' | 'audio' | 'file'>('image');
  const [disabled, setDisabled] = useState(false);
  window.__setMediaDisabled = setDisabled;

  return (
    <section aria-label="Media choice keyboard contract" className="fixture">
      <MediaDropDown
        className="fixture-media-dropdown"
        value={type}
        onChange={setType}
        disabled={disabled}
      />
      <output data-testid="media-type">{type}</output>
    </section>
  );
}

function InlineFixtureIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} data-testid="tooltip-icon-svg" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1 15 15H1z" />
    </svg>
  );
}

function IconTooltipField() {
  const [tooltip, setTooltip] = useState<string | undefined>('Help');
  window.__setIconTooltip = setTooltip;

  return (
    <section aria-label="Icon tooltip contracts" className="fixture">
      <span id="consumer-description">Consumer description</span>
      <Icon
        ref={(node) => { window.__iconSvg = node; }}
        component={InlineFixtureIcon}
        href="https://example.test/icon-help"
        aria-label="Help link"
        aria-describedby="consumer-description"
        tooltip={tooltip}
        onFocus={(event) => window.__iconEvents.push({ type: 'focus', currentTarget: event.currentTarget.tagName, trusted: event.nativeEvent.isTrusted })}
        onBlur={(event) => window.__iconEvents.push({ type: 'blur', currentTarget: event.currentTarget.tagName, trusted: event.nativeEvent.isTrusted })}
      />
      <button type="button" onClick={() => setTooltip('Updated help')}>Update Icon tooltip</button>
      <button type="button" onClick={() => setTooltip('')}>Empty Icon tooltip</button>
      <button type="button" onClick={() => setTooltip(undefined)}>Remove Icon tooltip</button>
      <output data-testid="icon-events" />
    </section>
  );
}

function ContentSwapField() {
  const [key, setKey] = useState('first');
  window.__setSwapKey = setKey;
  const onAnimationEnd = (target: string) => (event: ReactAnimationEvent<HTMLElement>) => {
    window.__swapEvents[target] = [...(window.__swapEvents[target] ?? []), { target: event.currentTarget.tagName, name: event.animationName }];
  };
  const onAnimationStart = (target: string) => (event: ReactAnimationEvent<HTMLElement>) => {
    window.__swapStarts[target] = [...(window.__swapStarts[target] ?? []), { name: event.animationName, text: event.currentTarget.textContent }];
  };

  return (
    <section aria-label="Shared content swap contracts" className="fixture">
      <Box
        ref={(node) => { window.__swapNodes.box = node; }}
        data-testid="swap-box"
        animate={['fadeInUp', { key }]}
        onAnimationEnd={onAnimationEnd('box')}
        onAnimationStart={onAnimationStart('box')}
        style={{ minHeight: 36 }}
      >Box {key}</Box>
      <Flex
        ref={(node) => { window.__swapNodes.flex = node; }}
        data-testid="swap-flex"
        animate={['fadeInUp', { key }]}
        onAnimationEnd={onAnimationEnd('flex')}
        onAnimationStart={onAnimationStart('flex')}
        style={{ minHeight: 36 }}
      >Flex {key}</Flex>
    </section>
  );
}

function LexicalRevealField() {
  const [content, setContent] = useState('');
  window.__setLexicalText = setContent;
  return (
    <section aria-label="Lexical reveal contracts" className="fixture">
      <div aria-hidden="true" style={{ height: 1200 }} />
      <LexicalText
        data-testid="lexical-reveal"
        content={content}
        reveal={['up', { duration: 'veryFast', fade: false }]}
      />
    </section>
  );
}

function DropdownContracts() {
  const [showInitial, setShowInitial] = useState(false);
  const [open, setOpen] = useState(false);
  const [allowChange, setAllowChange] = useState(false);
  const [cancelClick, setCancelClick] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [requests, setRequests] = useState<boolean[]>([]);
  const [expanded, setExpanded] = useState(true);

  return (
    <section aria-label="Dropdown state contracts" className="fixture">
      <button type="button" onClick={() => setShowInitial(true)}>Mount initially open dropdown</button>
      <button type="button" onClick={() => setAllowChange((value) => !value)}>Toggle dropdown approval</button>
      <button type="button" onClick={() => setCancelClick((value) => !value)}>Toggle dropdown cancellation</button>
      <button type="button" onClick={() => setDisabled((value) => !value)}>Toggle dropdown disabled</button>
      <button type="button" onClick={() => setExpanded((value) => !value)}>Toggle whole dropdown</button>
      <output data-testid="dropdown-requests">{JSON.stringify(requests)}</output>
      <Dropdown
        open={open}
        collapse={{ open: expanded }}
        onOpenChange={(next) => {
          setRequests((current) => [...current, next]);
          if (allowChange) setOpen(next);
        }}
        panel={{ portal: true, matchTriggerWidth: true }}
        trigger={
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => { if (cancelClick) event.preventDefault(); }}
          >Controlled dropdown</button>
        }
      >
        <button type="button">Controlled dropdown action</button>
      </Dropdown>
      {showInitial && <Dropdown
        defaultOpen
        trigger={<button type="button">Initially open dropdown</button>}
      >
        <button type="button">Initial dropdown action</button>
      </Dropdown>}
    </section>
  );
}

function DropdownNestedContracts() {
  const [clicks, setClicks] = useState(0);
  return <section aria-label="Nested dropdown contracts" className="fixture">
    <Dropdown blockOutsideClick panel={{ portal: true }} trigger={<button type="button">Outer choices</button>}>
      <button type="button">First outer choice</button>
      <Dropdown blockOutsideClick panel={{ portal: true }} trigger={<button type="button">Inner choices</button>}>
        <input aria-label="Inner choice input" />
        <button type="button">Inner choice action</button>
      </Dropdown>
    </Dropdown>
    <button type="button" onClick={() => setClicks((count) => count + 1)}>Outside dropdown target</button>
    <output data-testid="dropdown-outside-clicks">{clicks}</output>
  </section>;
}

function DropdownSizingContracts() {
  return (
    <section aria-label="Dropdown intrinsic sizing" className="fixture">
      <Flex justify={['center', 'center', 'center']}>
        {(['start', 'center', 'end'] as const).map((side) => (
          <Dropdown
            key={side}
            w={[200, 200, 200]}
            style={{ padding: 4, border: '1px solid transparent' }}
            panel={{ side }}
            trigger={<button type="button">Intrinsic {side}</button>}
          >
            <Flex
              data-testid={`intrinsic-surface-${side}`}
              style={{ boxSizing: 'border-box' }}
              w={['100%', '100%', '100%']}
              minW={[264, 264, 264]}
              p={[8, 8, 8]}
              dir={['column', 'column', 'column']}
            >
              <Button>Wide menu action</Button>
            </Flex>
          </Dropdown>
        ))}
        <Dropdown
          panel={{ portal: true, side: 'end', w: [900, 900, 900], maxW: [900, 900, 900] }}
          trigger={<button type="button">Intrinsic portal</button>}
        >
          <Flex data-testid="intrinsic-surface-portal" w={['100%', '100%', '100%']}>
            <Button>Wide portal action</Button>
          </Flex>
        </Dropdown>
      </Flex>
    </section>
  );
}

function DeclarativeModalContracts() {
  const [controlledOpen, setControlledOpen] = useState(false);
  const [allowClose, setAllowClose] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [changes, setChanges] = useState<boolean[]>([]);
  const [content, setContent] = useState(0);
  const [showDefault, setShowDefault] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  return (
    <section aria-label="Declarative Modal contracts" className="fixture">
      <output data-testid="declarative-modal-log">{JSON.stringify({ clicks, changes })}</output>
      <Modal
        ref={surfaceRef}
        trigger={<button type="button" onClick={() => setClicks((value) => value + 1)}>Open controlled declaration</button>}
        open={controlledOpen}
        onOpenChange={(next) => { setChanges((values) => [...values, next]); if (next || allowClose) setControlledOpen(next); }}
        aria-label="Controlled declaration"
        style={{ width: 360, maxHeight: 240 }}
        scroll={{ gutter: false, p: [16, 16, 16] }}
      >{(close) => <>
        <button type="button" onClick={close}>Request declaration close</button>
        <button type="button" onClick={() => setAllowClose(true)}>Allow declaration close</button>
        <button type="button" onClick={() => setContent((value) => value + 1)}>Update declaration content</button>
        <button type="button" onClick={() => { if (surfaceRef.current) surfaceRef.current.dataset.refVerified = 'true'; }}>Verify declaration ref</button>
        <p data-testid="declaration-content">Current content {content}</p>
        <ModalStackOpener />
      </>}</Modal>
      <Modal
        trigger={<button type="button" onClick={(event) => { event.preventDefault(); setClicks((value) => value + 1); }}>Cancelled declaration</button>}
        aria-label="Cancelled declaration dialog"
      >This opening should be cancelled.</Modal>
      <Modal
        trigger={<button type="button" disabled>Disabled declaration</button>}
        aria-label="Disabled declaration dialog"
      >This opening should be disabled.</Modal>
      <button type="button" onClick={() => setShowDefault(true)}>Mount default declaration</button>
      {showDefault && <Modal defaultOpen aria-label="Default declaration" style={{ width: 360 }}>
        {(close) => <button type="button" onClick={close}>Close default declaration</button>}
      </Modal>}
      <Modal
        trigger={<button type="button">Open mobile declaration</button>}
        closeOn={{ breakpoint: 'desktop' }}
        aria-label="Mobile declaration"
        preset={['fullWidth', 'fullWidth', 'fullWidth']}
        w={['100%', '100%', '100%']}
        h={['100dvh', '100dvh', '100dvh']}
        scroll={{ gutter: false }}
        animate={{ when: 'open', effect: 'down', distance: 'full', duration: 0.8 }}
      >{(close) => <>
        <button type="button" onClick={close}>Close mobile declaration</button>
        <div style={{ height: 1600 }}>Long mobile declaration content</div>
      </>}</Modal>
    </section>
  );
}

function ModalScrollLockContracts() {
  const [firstMounted, setFirstMounted] = useState(true);
  const [secondMounted, setSecondMounted] = useState(true);
  const openSecond = useRef<(() => void) | null>(null);

  return (
    <section aria-label="Modal scroll lock contracts" className="fixture">
      {firstMounted && <ModalProvider>
        <ModalScrollLeaseOpener
          name="First independent lease"
          unmountSelf={() => setFirstMounted(false)}
          openOther={() => openSecond.current?.()}
        />
      </ModalProvider>}
      {secondMounted && <ModalProvider>
        <ModalScrollLeaseOpener
          name="Second independent lease"
          unmountSelf={() => setSecondMounted(false)}
          unmountOther={() => setFirstMounted(false)}
          registerOpen={(open) => { openSecond.current = open; }}
        />
      </ModalProvider>}
    </section>
  );
}

function ModalScrollLeaseOpener({ name, unmountSelf, unmountOther, openOther, registerOpen }: {
  name: string;
  unmountSelf: () => void;
  unmountOther?: () => void;
  openOther?: () => void;
  registerOpen?: (open: () => void) => void;
}) {
  const { present } = useModal();
  const open = () => { present(
    <Modal aria-label={name} style={{ width: 360, maxHeight: 240 }}>
      {openOther && <button type="button" onClick={openOther}>Open second independent lease</button>}
      {unmountOther && <button type="button" onClick={unmountOther}>Unmount first provider</button>}
      <button type="button" onClick={unmountSelf}>Unmount {name}</button>
      <div style={{ height: 1600 }}>Long independently scrolling modal content</div>
      <button type="button">Last focus stop in {name}</button>
    </Modal>,
  ); };
  registerOpen?.(open);

  return <button type="button" onClick={open}>Open {name}</button>;
}

function ModalDropdownField() {
  const { present } = useModal();
  const open = () => present(
    <Modal aria-label="Browser regression modal" style={{ maxHeight: 240, overflowY: 'auto', width: 360 }}>
      <div style={{ height: 520 }}>Long modal content</div>
      <Dropdown
        panel={{ portal: true, side: 'end', offset: 12 }}
        trigger={<button type="button" data-testid="nested-dropdown-trigger">Nested actions</button>}
      >
        <button type="button" data-testid="nested-dropdown-action">Choose action</button>
      </Dropdown>
    </Modal>,
  );
  return <button type="button" onClick={open}>Open scroll modal</button>;
}

function ModalSelectField() {
  const { present } = useModal();
  const open = () => present(
    <Modal aria-label="Portal select modal" style={{ maxHeight: 240, overflowY: 'auto', width: 360 }}>
      <div style={{ height: 320 }}>Scroll before the select</div>
      <ModalSelectContent />
    </Modal>,
  );
  return <button type="button" onClick={open}>Open portal select modal</button>;
}

function ModalSelectContent() {
  const [value, setValue] = useState<string | null>('first');
  return (
    <form id="modal-select-form" data-testid="modal-select-form">
      <Select
        aria-label="Select inside modal"
        name="modalChoice"
        form="modal-select-form"
        value={value}
        onChange={(next) => { setValue(next); window.__modalSelectChanges.push(next ?? ''); }}
        options={[{ value: 'first', label: 'First option' }, { value: 'second', label: 'Second option' }]}
      />
    </form>
  );
}

function ModalStackField() {
  const { present } = useModal();
  const open = () => present(
    <Modal aria-label="Lower stacked modal" style={{ width: 360 }}>
      <p>Lower modal content</p>
      <ModalStackOpener />
    </Modal>,
  );
  return <button type="button" onClick={open}>Open stacked modal</button>;
}

function ModalCalendarField() {
  const { present } = useModal();
  return (
    <button type="button" onClick={() => present(
      <Modal aria-label="Calendar focus modal" style={{ width: 360 }}>
        <div data-testid="modal-calendar-control">
          <Input type="date" aria-label="Modal date" data-testid="modal-date" defaultValue="2025-01-15" />
        </div>
        <button type="button" data-testid="modal-after-date">After date field</button>
      </Modal>,
    )}>Open calendar focus modal</button>
  );
}

function ModalStackOpener() {
  const { present } = useModal();
  return (
    <button type="button" data-testid="open-top-modal" onClick={() => present(
      <Modal aria-label="Top stacked modal" style={{ width: 360 }}>
        <button type="button" data-testid="top-first">Top first focus stop</button>
        <button type="button" data-testid="top-last">Top last focus stop</button>
      </Modal>,
    )}>Open top modal</button>
  );
}

function CarouselEffectsField() {
  const [effect, setEffect] = useState<'slide' | 'fade' | 'cube' | 'coverflow' | 'flip'>('slide');
  window.__setCarouselEffect = setEffect;
  return (
    <section aria-label="Carousel effect contracts" className="fixture">
      <Carousel data-testid="effect-carousel" effect={effect} speed={0} slidesPerView={1} navigation="none" drag={false}>
        <div>Effect slide one</div>
        <div>Effect slide two</div>
        <div>Effect slide three</div>
      </Carousel>
    </section>
  );
}

function CarouselNavField() {
  return (
    <section aria-label="Carousel navigation keyboard contracts" className="fixture">
      <Carousel carouselId="nav-fixture" navigation="arrows" slidesPerView={1} speed={0} drag={false}>
        <div>Navigation slide one</div>
        <div>Navigation slide two</div>
        <div>Navigation slide three</div>
      </Carousel>
      <CarouselNav carouselId="nav-fixture" className="fixture-carousel-nav" />
    </section>
  );
}

function VideoTimelineField() {
  return (
    <section aria-label="Video timeline keyboard contract" className="fixture">
      <VideoPlayer data-testid="keyboard-video" controls={['timeline', 'time', 'volume']} />
    </section>
  );
}

function NativeFocusFields() {
  const [chip, setChip] = useState(false);
  return (
    <section aria-label="Native focus visibility contracts" className="fixture">
      <button type="button" data-testid="focus-sequence-start">Start focus sequence</button>
      <Checkbox aria-label="Keyboard checkbox">Keyboard checkbox</Checkbox>
      <Radio aria-label="Keyboard radio" name="keyboard-radio" value="one">Keyboard radio</Radio>
      <SwitchButton aria-label="Keyboard switch">Keyboard switch</SwitchButton>
      <Checkbox indicator={false} aria-label="Chip checkbox" checked={chip} onChange={event => setChip(event.target.checked)}>Chip checkbox</Checkbox>
      <Radio indicator={false} aria-label="Chip radio" name="chip-radio" value="chip" checked={chip} aria-invalid onChange={() => setChip(true)}>Chip radio</Radio>
      <div data-testid="calendar-control">
        <Input type="date" aria-label="Keyboard date" data-testid="keyboard-date" defaultValue="2025-01-15" />
      </div>
    </section>
  );
}

function MotionFixtures() {
  const [scrollParallax, setScrollParallax] = useState(true);
  const record = (key: string, name: string) => (event: ReactMouseEvent<HTMLElement>) => {
    window.__motionEvents[key] = [...(window.__motionEvents[key] ?? []), name];
    if (key === 'img') window.__imageMotionTargets.push(event.currentTarget.tagName);
  };
  const interactionProps = (key: string) => ({
    perspective3d: 600,
    linkState: { target: 'motion-state', on: 'hover' as const, set: 'hover' },
    onMouseEnter: record(key, 'enter'),
    onMouseMove: record(key, 'move'),
    onMouseLeave: record(key, 'leave'),
  });

  return (
    <section aria-label="Shared motion callback contracts" className="fixture">
      <Box data-testid="parallax-target" parallax={{ distance: 40, scroll: 'native' }} style={{ width: 240, height: 160 }}><span>Parallax photo surface</span></Box>
      <button data-testid="toggle-scroll-parallax" onClick={() => setScrollParallax((value) => !value)}>Toggle scroll parallax</button>
      {scrollParallax && <Box data-testid="parallax-scroll-target" parallax={{ distance: 40, mode: 'scroll' }} perspective3d={{ perspective: 1600, follow: 'viewport' }} animate={{ when: 'inView', effect: 'up', duration: 0.3 }} style={{ width: 240, height: 160 }}>Native parallax with reveal and tilt</Box>}
      <Button data-testid="idle-visibility" animate={{ when: 'idle', effect: 'glow', duration: 2 }}>Idle visibility</Button>
      <div id="motion-state" data-testid="motion-state" />
      <Text data-testid="motion-text" {...interactionProps('text')}>Text motion</Text>
      <Grid data-testid="motion-grid" columns={[1, 1, 1]} {...interactionProps('grid')}>
        <div>Grid motion</div>
      </Grid>
      <GridItem
        data-testid="motion-grid-item"
        perspective3d={600}
        onMouseEnter={record('grid-item', 'enter')}
        onMouseMove={record('grid-item', 'move')}
        onMouseLeave={record('grid-item', 'leave')}
      >Grid item motion</GridItem>
      <Img
        ref={(node) => { window.__imageRoot = node; }}
        data-testid="motion-img"
        alt="Motion image"
        src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
        w={[96, 96, 96]}
        h={[96, 96, 96]}
        style={{ width: 96, height: 96 }}
        onClick={(event) => { window.__imageClickTargets.push(event.currentTarget.tagName); }}
        {...interactionProps('img')}
      />
    </section>
  );
}

const motionImageA = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48"%3E%3Crect width="80" height="48" fill="%23a33"/%3E%3C/svg%3E';
const motionImageC = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48"%3E%3Crect width="80" height="48" fill="%2333a"/%3E%3C/svg%3E';

function ImgChangeContracts() {
  const [src, setSrc] = useState(motionImageA);
  const [direction, setDirection] = useState<1 | -1>(1);

  return (
    <section aria-label="Image change animation" className="fixture" style={{ '--t-d-fast': '0.35s' } as CSSProperties}>
      <button type="button" data-testid="img-change-remote" onClick={() => setSrc('/motion-two.svg')}>Load remote image</button>
      <button type="button" data-testid="img-change-latest" onClick={() => setSrc(motionImageC)}>Choose latest image</button>
      <button type="button" data-testid="img-change-reverse" onClick={() => setDirection((value) => value === 1 ? -1 : 1)}>Reverse image direction</button>
      <div data-testid="change-img">
        <Img
          alt="Animated source"
          src={src}
          w={[160, 160, 160]}
          h={[96, 96, 96]}
          style={{ width: 160, height: 96 }}
          animate={{ when: 'change', effect: 'veil', duration: 'fast', direction, veil: <span data-testid="image-veil-content" /> }}
        />
      </div>
    </section>
  );
}

function TextObjectMotionContracts() {
  const [counterTo, setCounterTo] = useState(100);
  const [slideText, setSlideText] = useState('Page A');

  return (
    <section aria-label="Object text animation" className="fixture" style={{ '--t-d-fast': '0.35s' } as CSSProperties}>
      <button type="button" data-testid="counter-change-target" onClick={() => setCounterTo((value) => value + 100)}>Change counter target</button>
      <Text as="span" data-testid="text-load-counter" aria-label="Load counter" animate={{ when: 'load', effect: 'counter', duration: 'fast', to: counterTo }}>0</Text>
      <div style={{ height: 1200 }} aria-hidden />
      <Text as="span" data-testid="text-inview-counter" aria-label="Viewport counter" animate={{ when: 'inView', effect: 'counter', duration: 'fast', to: 50 }}>0</Text>
      <button type="button" data-testid="text-slide-update" onClick={() => setSlideText((value) => value === 'Page A' ? 'Page B' : 'Page A')}>Update slide text</button>
      <Text as="span" data-testid="text-slide-object" aria-label="Page title" animate={{ when: 'change', effect: 'textSlide', duration: 'fast' }}>{slideText}</Text>
    </section>
  );
}

function InViewContracts() {
  const animate = { effect: 'up', when: 'inView', delay: 0.02, duration: 0.04 } as const;

  return (
    <section aria-label="Unified viewport animation" className="fixture">
      <div data-testid="legacy-icon-host"><Icon component={InlineFixtureIcon} /></div>
      <div data-inview-case="box"><Box animate={animate}>View box</Box></div>
      <div data-inview-case="flex"><Flex animate={animate}>View flex</Flex></div>
      <div data-inview-case="grid"><Grid animate={animate}>View grid</Grid></div>
      <div data-inview-case="grid-item"><GridItem animate={animate}>View grid item</GridItem></div>
      <div data-inview-case="text"><Text animate={animate}>View text</Text></div>
      <div data-inview-case="lexical"><LexicalText content="<p>View lexical</p>" animate={animate} /></div>
      <div data-inview-case="input"><Input aria-label="View input" animate={animate} /></div>
      <div data-inview-case="textarea"><Textarea aria-label="View textarea" animate={animate} /></div>
      <div data-inview-case="button"><Button animate={animate}>View button</Button></div>
      <div data-inview-case="checkbox"><Checkbox animate={animate}>View checkbox</Checkbox></div>
      <div data-inview-case="radio"><Radio name="view-radio" value="one" animate={animate}>View radio</Radio></div>
      <div data-inview-case="switch"><SwitchButton animate={animate} aria-label="View switch" /></div>
      <div data-inview-case="section"><Section animate={animate}>View section</Section></div>
      <div data-inview-case="icon"><Icon component={InlineFixtureIcon} animate={animate} /></div>
      <div data-inview-case="hover-icon"><Icon component={InlineFixtureIcon} hover={InlineFixtureIcon} animate={animate} /></div>
      <div data-inview-case="image">
        <Img
          src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          alt="View image"
          w={[64, 64, 64]}
          h={[64, 64, 64]}
          animate={animate}
        />
      </div>
      <div data-inview-case="select">
        <Select options={[{ value: 'one', label: 'View option' }]} animate={animate} />
      </div>
      <div data-inview-case="phone">
        <PhoneField country={{ countries: ['RU'], default: 'RU' }} value="" aria-label="View phone" animate={animate} />
      </div>
    </section>
  );
}

function InputPartsField() {
  const [error, setError] = useState<string | undefined>('Исправьте значение');

  return (
    <section aria-label="Modular Input contracts" className="fixture">
      <form data-testid="modular-input-form">
        <Input
          name="password"
          label="Modular password"
          type="password"
          revealable
          defaultValue="secret"
          error={error}
          errorPlacement="below"
          comment="Подсказка поля"
          data-testid="modular-password"
        />
        <button type="button" onClick={() => setError(undefined)}>Clear modular error</button>
      </form>
    </section>
  );
}

function AccordionContracts() {
  return (
    <section aria-label="Accordion trigger contracts" className="fixture">
      <Accordion>
        <AccordionItem
          value="object"
          trigger={{
            content: <span>Object trigger</span>,
            p: [12, 12, 12],
            gap: [16, 16, 16],
            className: 'object-trigger',
          }}
          triggerProps={{ p: [4, 4, 4], className: 'legacy-trigger' }}
        >Object panel</AccordionItem>
        <AccordionItem value="legacy" trigger={<><span>Legacy</span> trigger</>}>
          Legacy panel
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function NamedTimingContracts({ skipDecoration }: { skipDecoration: boolean }) {
  return (
    <section
      aria-label="Named motion timing"
      className="fixture"
      style={{ '--t-d-very-fast': '0.02s', '--t-d-fast': '0.05s', '--t-d-very-slow': '0.8s' } as React.CSSProperties}
    >
      <Box data-testid="named-view" animate={{ when: 'inView', effect: 'up', duration: 'verySlow', delay: 'fast', stagger: 'veryFast' }}>
        <div>Named view first</div>
        <div>Named view second</div>
      </Box>
      <Box data-testid="named-load" animate={{ when: 'load', effect: 'up', duration: 'verySlow', delay: 'fast', stagger: 'veryFast' }}>
        <div data-testid="named-load-first">Named load first</div>
        <div data-testid="named-load-decoration" data-reveal-skip="">Decorative guide</div>
        <Box data-testid="named-load-owned" animate={{ when: 'load', effect: 'up', duration: 'verySlow', delay: 'veryFast' }}>Owned load animation</Box>
        <div data-testid="named-load-second">Named load second</div>
      </Box>
      <Box data-testid="named-inview" animate={{ when: 'inView', effect: 'up', duration: 'fast', delay: 'fast', stagger: 'veryFast' }}>
        <div data-testid="named-inview-first">In-view first</div>
        <div data-testid="named-inview-decoration" data-reveal-skip={skipDecoration ? '' : undefined} style={{ marginTop: 1200 }}>In-view decoration</div>
        <div data-testid="named-inview-last">In-view last</div>
      </Box>
    </section>
  );
}

function SelectPanelContracts() {
  return (
    <section aria-label="Select panel contracts">
      {(['primary', 'primaryFill', 'secondary'] as const).map((variant) => (
        <Select
          key={variant}
          aria-label={`Panel ${variant}`}
          variant={[variant, variant, variant]}
          size={['fullWidth', 'fullWidth', 'fullWidth']}
          multiple
          closeOnSelect
          style={{ '--select-dropdown-radius': '24px', '--select-dropdown-radius-top': '6px' } as CSSProperties}
          options={[{ label: 'Panel group', options: [{ value: 'one', label: 'Panel option one' }, { value: 'two', label: 'Panel option two' }] }]}
        />
      ))}
      <Select aria-label="Empty panel" options={[]} />
      <Select aria-label="Loading panel" options={[{ value: 'one', label: 'Loading option' }]} loading />
      <Select aria-label="Disabled panel" options={[{ value: 'one', label: 'Disabled option' }]} disabled />
    </section>
  );
}

function BoxLayoutContracts() {
  const [hidden, setHidden] = useState(true);
  return (
    <section data-testid="box-layout-contracts">
      <Button onClick={() => setHidden((value) => !value)}>Toggle responsive box</Button>
      <div data-testid="box-layout-host" style={{ position: 'relative', height: 100 }}>
        <Box
          data-testid="responsive-box"
          bg={['var(--primary)', 'var(--black)', 'var(--background)']}
          position={['absolute', 'absolute', 'absolute']}
          top={[24, 8, 16]}
          left={[24, 8, 16]}
          w={[80, 80, 80]}
          h={[40, 40, 40]}
        />
        <Box data-testid="responsive-hidden" hide={[hidden, false, hidden]}>Responsive visibility</Box>
        <Icon
          data-testid="positioned-icon"
          component={InlineFixtureIcon}
          href="#box-layout-contracts"
          aria-label="Positioned icon"
          position={['absolute', 'absolute', 'absolute']}
          right={[4, 4, 4]}
          top={[4, 4, 4]}
          w={[20, 20, 20]}
          h={[20, 20, 20]}
        />
      </div>
    </section>
  );
}

export function BrowserFixture() {
  if (typeof window !== 'undefined' && !window.__fieldLogs) initWindowState();
  const [skipDecoration, setSkipDecoration] = useState(false);

  return (
    <main className="fixture">
      <h1>Delba UI browser regression fixture</h1>
      <InteractionScopeFixture />
      <RefactorContractsFixture />
      <ScrollAreaFixture />
      <button
        type="button"
        data-testid="toggle-reveal-skip"
        style={{ position: 'fixed', top: 8, left: 8, zIndex: 1000 }}
        onClick={() => setSkipDecoration((value) => !value)}
      >Toggle in-view decorative marker</button>
      {/* Лог профайлера растёт на каждый коммит React. В потоке он менял высоту страницы ВЫШЕ
          текущей прокрутки, и scroll anchoring Chrome подкручивал window.scrollY — тесты, которые
          сверяют прокрутку и геометрию, падали мимо своей темы. Держим его вне потока. */}
      <output
        data-testid="react-profile"
        style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, overflow: 'hidden' }}
      />
      <ContractFields />
      <InViewContracts />
      <InputPartsField />
      <AccordionContracts />
      <PhoneFieldProfile />
      <MotionProfileField />
      <FormDataFields />
      <NumberFields />
      <CollapseField />
      <CollapseControlsFixture />
      <SearchableFlexField />
      <ButtonField />
      <MediaDropDownField />
      <IconTooltipField />
      <ContentSwapField />
      <LexicalRevealField />
      <LexicalText data-testid="lexical-markers" content={{ root: { children: [
        { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [{ type: 'text', text: 'Legacy bullet' }] }] },
        { type: 'list', listType: 'bullet', marker: 'dash', markerColor: 'var(--primary)', children: [{ type: 'listitem', children: [{ type: 'text', text: 'Colored dash' }] }] },
        { type: 'list', listType: 'number', start: 4, children: [{ type: 'listitem', children: [{ type: 'text', text: 'Fourth item' }] }] },
      ] } }} />
      <DropdownContracts />
      <DropdownNestedContracts />
      <DropdownSizingContracts />
      <SelectPanelContracts />
      <ModalDropdownField />
      <ModalScrollLockContracts />
      <DeclarativeModalContracts />
      <ModalSelectField />
      <ModalStackField />
      <ModalCalendarField />
      <CarouselEffectsField />
      <CarouselNavField />
      <VideoTimelineField />
      <NativeFocusFields />
      <MotionFixtures />
      <NamedTimingContracts skipDecoration={skipDecoration} />
      <ImgChangeContracts />
      <TextObjectMotionContracts />
      <TextTimelineFixture />
      <BoxLayoutContracts />
      <Flex position={['relative', 'relative', 'relative']} r={[24, 16, 20]} p={[24, 24, 24]} data-testid="gradient-frame">
        <GradientBorder gradient={['linear-gradient(90deg, red, blue)', 'linear-gradient(90deg, red, blue)', 'linear-gradient(90deg, red, blue)']} width={[4, 8, 4]} />
        <Button data-testid="gradient-button" animate={{ when: 'hover', effect: 'rise', fill: 'var(--primary)' }}>Framed action</Button>
      </Flex>
    </main>
  );
}
