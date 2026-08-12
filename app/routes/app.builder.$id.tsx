import { useState, useCallback, useEffect } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, TextField, Select, BlockStack, InlineStack, Icon, Checkbox, Tabs, Box, Divider, RangeSlider, Scrollable, Popover, Modal, Spinner, Badge, Tooltip } from "@shopify/polaris";
import { SaveIcon, ArrowLeftIcon, DuplicateIcon, DeleteIcon, TextIcon, EmailIcon, HashtagIcon, PhoneIcon, CheckIcon, UndoIcon, RedoIcon, DesktopIcon, MobileIcon, ViewIcon, SearchIcon, ButtonIcon, AppsIcon, CartIcon, DragHandleIcon, CheckboxIcon, CheckCircleIcon, CalendarIcon, UploadIcon, LockIcon, ClipboardIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request, params }: any) => {
  const { session } = await authenticate.admin(request);
  const id = params.id;
  
  const shop = await prisma.shop.findUnique({ where: { shop: session.shop } });
  const plan = shop?.plan || "FREE";
  
  if (id === "new") {
    return json({ form: { id: "new", title: "Untitled Form", globalStyles: {}, fields: [] }, plan });
  }

  const form = await prisma.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: 'asc' } } }
  });

  if (!form || form.shop !== session.shop) throw new Response("Not Found", { status: 404 });

  const rawFields = form.fields.map((f: any) => ({
    ...JSON.parse(f.settings || "{}"),
    id: f.id,
    type: f.type,
    label: f.label,
    order: f.order
  }));

  // Reconstruct nested tree
  const fieldMap = new Map();
  const rootFields: any[] = [];
  
  rawFields.forEach((f: any) => fieldMap.set(f.id, { ...f, children: [] }));
  rawFields.forEach((f: any) => {
    const node = fieldMap.get(f.id);
    if (f.parentId) {
      const parent = fieldMap.get(f.parentId);
      if (parent) parent.children.push(node);
      else rootFields.push(node);
    } else {
      rootFields.push(node);
    }
  });

  const sortTree = (nodes: any[]) => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach(n => sortTree(n.children));
  };
  sortTree(rootFields);

  const globalStyles = form.globalStyles ? JSON.parse(form.globalStyles) : {};

  return json({ form: { ...form, globalStyles, fields: rootFields }, plan });
};

export const action = async ({ request, params }: any) => {
  const { session } = await authenticate.admin(request);
  let id = params.id;
  const formData = await request.formData();
  const payload = JSON.parse(formData.get("payload"));

  if (id === "new") {
    id = Math.random().toString(36).substring(7);
  }

  const globalStylesStr = JSON.stringify(payload.globalStyles || {});

  // Verify ownership if not new
  if (params.id !== "new") {
    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing || existing.shop !== session.shop) {
      throw new Response("Unauthorized", { status: 401 });
    }
    
    await prisma.form.update({
      where: { id },
      data: {
        title: payload.title,
        globalStyles: globalStylesStr
      }
    });
  } else {
    await prisma.form.create({
      data: {
        id,
        shop: session.shop,
        title: payload.title || "Untitled Form",
        globalStyles: globalStylesStr
      }
    });
  }

  const flattenFields = (fields: any[], parentId: string | null = null) => {
    let flat: any[] = [];
    fields.forEach((f, i) => {
      const { children, id: fId, type, label, order, ...settings } = f;
      const safeId = fId || Math.random().toString(36).substring(7);
      flat.push({
        id: safeId,
        formId: id,
        type: type || 'text',
        label: label || 'Field',
        settings: JSON.stringify({ ...settings, parentId }),
        order: i
      });
      if (children && children.length > 0) {
        flat = flat.concat(flattenFields(children, safeId));
      }
    });
    return flat;
  };

  const inserts = flattenFields(payload.fields);
  const incomingIds = inserts.map(f => f.id);

  // Delete fields that are no longer present
  await prisma.formField.deleteMany({
    where: {
      formId: id,
      id: { notIn: incomingIds }
    }
  });

  // Upsert all incoming fields
  for (const field of inserts) {
    await prisma.formField.upsert({
      where: { id: field.id },
      create: field,
      update: {
        type: field.type,
        label: field.label,
        settings: field.settings,
        order: field.order
      }
    });
  }

  if (params.id === "new") {
    return redirect(`/app/forms/${id}`);
  }
  
  return json({ success: true });
};

const WIDGETS = [
  { category: 'Structure', items: [
    { type: 'container', label: 'Container', icon: AppsIcon },
    { type: 'heading', label: 'Heading', icon: TextIcon },
    { type: 'paragraph', label: 'Paragraph', icon: TextIcon },
    { type: 'image', label: 'Image', icon: ViewIcon },
    { type: 'divider', label: 'Divider', icon: ViewIcon },
    { type: 'spacer', label: 'Spacer', icon: ViewIcon },
    { type: 'pagebreak', label: 'Page Break', icon: ViewIcon },
    { type: 'html', label: 'HTML', icon: ViewIcon }
  ]},
  { category: 'Basic', items: [
    { type: 'text', label: 'Text', icon: TextIcon },
    { type: 'email', label: 'Email', icon: EmailIcon },
    { type: 'url', label: 'Website URL', icon: ViewIcon },
    { type: 'number', label: 'Number', icon: HashtagIcon },
    { type: 'phone', label: 'Phone', icon: PhoneIcon },
    { type: 'password', label: 'Password', icon: ViewIcon },
    { type: 'textarea', label: 'Long Text', icon: TextIcon }
  ]},
  { category: 'Choice', items: [
    { type: 'dropdown', label: 'Dropdown', icon: ViewIcon },
    { type: 'checkbox', label: 'Checkboxes', icon: CheckboxIcon },
    { type: 'radio', label: 'Radio Buttons', icon: CheckCircleIcon },
    { type: 'toggle', label: 'Toggle / Switch', icon: ViewIcon }
  ]},
  { category: 'Media', items: [
    { type: 'fileupload', label: 'File Upload', icon: UploadIcon },
    { type: 'imageupload', label: 'Image Upload', icon: ViewIcon },
    { type: 'signature', label: 'Signature', icon: TextIcon }
  ]},
  { category: 'Advanced', items: [
    { type: 'quantity', label: 'Quantity Stepper', icon: HashtagIcon },
    { type: 'rangeslider', label: 'Slider / Range', icon: ViewIcon },
    { type: 'color', label: 'Color Picker', icon: ViewIcon }
  ]},
  { category: 'Survey & Feedback', items: [
    { type: 'rating', label: 'Star Rating', icon: ViewIcon },
    { type: 'scale', label: 'Opinion Scale', icon: ViewIcon }
  ]},
  { category: 'Legal', items: [
    { type: 'legal', label: 'Legal / Terms', icon: TextIcon }
  ]},
  { category: 'Layout', items: [
    { type: 'submit', label: 'Submit Button', icon: ButtonIcon }
  ]}
];

function useUndoableState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [pointer, setPointer] = useState(0);

  const set = useCallback((value: T) => {
    setState(value);
    setHistory((prev) => {
      const newHistory = prev.slice(0, pointer + 1);
      newHistory.push(value);
      return newHistory;
    });
    setPointer((prev) => prev + 1);
  }, [pointer]);

  const undo = useCallback(() => {
    if (pointer > 0) {
      setPointer((prev) => prev - 1);
      setState(history[pointer - 1]);
    }
  }, [history, pointer]);

  const redo = useCallback(() => {
    if (pointer < history.length - 1) {
      setPointer((prev) => prev + 1);
      setState(history[pointer + 1]);
    }
  }, [history, pointer]);

  return { state, set, undo, redo, canUndo: pointer > 0, canRedo: pointer < history.length - 1 };
}

// --- Custom UI Controls for Sidebar ---

const SliderControl = ({ label, value, onChange, min = 0, max = 100, defaultUnit = 'px', mobileValue, onMobileChange }: any) => {
  const [isMobile, setIsMobile] = useState(false);
  const valStr = ((isMobile ? mobileValue : value) || '').toString();
  const isCustom = !['px', '%', 'rem', 'em', 'vh', 'vw'].some(u => valStr.endsWith(u)) && valStr !== '';
  
  let currentUnit = defaultUnit;
  let numVal: string | number = '';
  
  if (isCustom) {
    currentUnit = 'custom';
    numVal = valStr;
  } else {
    for (const u of ['px', '%', 'rem', 'em', 'vh', 'vw']) {
      if (valStr.endsWith(u)) {
        currentUnit = u;
        numVal = valStr.replace(u, '');
        break;
      }
    }
    if (numVal === '') numVal = parseFloat(valStr) || 0;
  }

  const fireChange = (v: string) => {
    if (isMobile && onMobileChange) onMobileChange(v);
    else onChange(v);
  };

  const handleUnitChange = (e: any) => {
    const newUnit = e.target.value;
    if (newUnit === 'custom') {
      fireChange(valStr);
    } else {
      fireChange(`${parseFloat(numVal as string) || 0}${newUnit}`);
    }
  };

  const handleTextChange = (e: any) => {
    const v = e.target.value;
    if (currentUnit === 'custom') {
      fireChange(v);
    } else {
      fireChange(`${v}${currentUnit}`);
    }
  };

  const handleSliderChange = (e: any) => {
    fireChange(`${e.target.value}${currentUnit}`);
  };

  const percent = currentUnit !== 'custom' ? (((parseFloat(numVal as string) || 0) - min) / (max - min)) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
        {onMobileChange && (
          <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div onClick={() => setIsMobile(false)} style={{ padding: '2px 6px', backgroundColor: !isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>💻</div>
            <div onClick={() => setIsMobile(true)} style={{ padding: '2px 6px', backgroundColor: isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>📱</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {currentUnit !== 'custom' && (
          <input 
            type="range" 
            className="custom-slider"
            min={min} max={max} value={parseFloat(numVal as string) || 0} onChange={handleSliderChange} 
            style={{ flex: 1, background: `linear-gradient(to right, #005bd3 0%, #005bd3 ${percent}%, #e2e8f0 ${percent}%, #e2e8f0 100%)` }}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff', width: currentUnit === 'custom' ? '100%' : 'auto' }}>
          <input 
            type="text" 
            value={numVal} 
            onChange={handleTextChange}
            style={{ width: currentUnit === 'custom' ? '100%' : '40px', textAlign: 'center', border: 'none', padding: '6px 4px', fontSize: '13px', outline: 'none' }}
          />
          <select style={{ border: 'none', borderLeft: '1px solid #cbd5e0', padding: '6px 8px', fontSize: '12px', color: '#718096', backgroundColor: '#f7fafc', outline: 'none', cursor: 'pointer' }} value={currentUnit} onChange={handleUnitChange}>
            <option value="px">px</option>
            <option value="%">%</option>
            <option value="rem">rem</option>
            <option value="em">em</option>
            <option value="vh">vh</option>
            <option value="vw">vw</option>
            <option value="custom">custom</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const AssetPickerControl = ({ label, value, onOpenPicker, onRemove, type }: { label: string, value: string, onOpenPicker: () => void, onRemove: () => void, type: 'media' | 'icon' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
      <div style={{ border: '1px solid #cbd5e0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fafbfb', padding: value ? '0' : '8px' }}>
        {value ? (
          <div style={{ position: 'relative', width: '100%', height: '100px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {type === 'media' ? (
              <img src={value} alt={label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <img src={value} alt={label} style={{ maxWidth: '40px', maxHeight: '40px', objectFit: 'contain' }} />
            )}
            <div className="asset-picker-actions" style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '4px' }}>
              <Button size="micro" onClick={onOpenPicker}>Replace</Button>
              <Button size="micro" tone="critical" onClick={onRemove}>Remove</Button>
            </div>
          </div>
        ) : (
          <div onClick={onOpenPicker} style={{ width: '100%', height: '80px', border: '1px dashed #cbd5e0', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#718096', transition: 'background-color 0.2s', boxSizing: 'border-box' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <div style={{ marginBottom: '4px' }}>
               <Icon source={type === 'media' ? UploadIcon : ViewIcon} tone="subdued" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Select {type === 'media' ? 'Image' : 'Icon'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ColorControl = ({ label, value, onChange, darkValue, onDarkChange }: any) => {
  const [isDark, setIsDark] = useState(false);
  const currentValue = isDark ? darkValue : value;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
        {onDarkChange && (
          <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div onClick={() => setIsDark(false)} style={{ padding: '2px 6px', backgroundColor: !isDark ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>☀</div>
            <div onClick={() => setIsDark(true)} style={{ padding: '2px 6px', backgroundColor: isDark ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>🌙</div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: '1px solid #cbd5e0', borderRadius: '6px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
        <input 
          type="text" 
          value={currentValue || ''} onChange={(e) => isDark ? onDarkChange(e.target.value) : onChange(e.target.value)}
          style={{ flex: 1, border: 'none', padding: '8px 12px', fontSize: '13px', outline: 'none', color: '#2d3748' }}
          placeholder="#FFFFFF"
        />
        <div style={{ position: 'absolute', right: '8px', width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
          <input 
            type="color" 
            value={currentValue || '#000000'} 
            onChange={(e) => isDark ? onDarkChange(e.target.value) : onChange(e.target.value)}
            style={{ position: 'absolute', top: '-10px', left: '-10px', width: '40px', height: '40px', border: 'none', cursor: 'pointer', padding: 0 }}
          />
        </div>
      </div>
    </div>
  );
};

const FourWaySpacingControl = ({ label, value, onChange, mobileValue, onMobileChange }: any) => {
  const [linked, setLinked] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const valStr = ((isMobile ? mobileValue : value) || '').toString();
  let unit = 'px';
  for (const u of ['px', 'rem', 'em', 'vh', 'vw']) {
    if (valStr.includes(u)) {
      unit = u;
      break;
    }
  }
  const isCustom = !valStr.includes(unit) && valStr !== '';
  const currentUnit = isCustom ? 'custom' : unit;

  const parseValue = (val: string) => {
    if (!val) return ['0', '0', '0', '0'];
    const parts = val.replace(new RegExp(currentUnit, 'g'), '').split(' ').filter(p => p !== '');
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 4) return [parts[0], parts[1], parts[2], parts[3]];
    return ['0', '0', '0', '0'];
  };

  const vals = parseValue(valStr);

  const fireChange = (v: string) => {
    if (isMobile && onMobileChange) onMobileChange(v);
    else onChange(v);
  };

  const handleUnitChange = (e: any) => {
    const newUnit = e.target.value;
    if (newUnit === 'custom') {
      fireChange(valStr);
    } else {
      fireChange(`${vals[0]}${newUnit} ${vals[1]}${newUnit} ${vals[2]}${newUnit} ${vals[3]}${newUnit}`);
    }
  };

  const updateVal = (idx: number, newVal: string) => {
    if (currentUnit === 'custom') {
      fireChange(newVal);
      return;
    }
    if (linked) {
      fireChange(`${newVal}${currentUnit}`);
    } else {
      const next = [...vals];
      next[idx] = newVal;
      fireChange(`${next[0] || 0}${currentUnit} ${next[1] || 0}${currentUnit} ${next[2] || 0}${currentUnit} ${next[3] || 0}${currentUnit}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onMobileChange && (
            <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div onClick={() => setIsMobile(false)} style={{ padding: '2px 6px', backgroundColor: !isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>💻</div>
              <div onClick={() => setIsMobile(true)} style={{ padding: '2px 6px', backgroundColor: isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>📱</div>
            </div>
          )}
          {currentUnit !== 'custom' && (
            <div 
              style={{ cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', backgroundColor: linked ? '#f4f6f8' : 'transparent' }} 
              onClick={() => setLinked(!linked)}
            >
              <Icon source={AppsIcon} tone={linked ? "base" : "subdued"} />
            </div>
          )}
        </div>
      </div>
      
      {currentUnit === 'custom' ? (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
          <input type="text" value={valStr} onChange={(e) => fireChange(e.target.value)} style={{ flex: 1, border: 'none', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid #cbd5e0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', flex: 1 }}>
            {['Top', 'Right', 'Bottom', 'Left'].map((side, i) => (
              <div key={side} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, borderRight: i < 3 ? '1px solid #e2e8f0' : 'none' }}>
                <input 
                  type="text" 
                  value={vals[i]} 
                  onChange={(e) => updateVal(i, e.target.value)} 
                  style={{ width: '100%', textAlign: 'center', border: 'none', padding: '8px 4px 0', fontSize: '13px', outline: 'none', backgroundColor: 'transparent' }} 
                />
                <span style={{ fontSize: '9px', color: '#a0aec0', textTransform: 'uppercase', paddingBottom: '4px' }}>{side[0]}</span>
              </div>
            ))}
          </div>
          <select style={{ border: 'none', borderLeft: '1px solid #cbd5e0', padding: '0 8px', fontSize: '12px', color: '#718096', backgroundColor: '#f7fafc', outline: 'none', cursor: 'pointer' }} value={currentUnit} onChange={handleUnitChange}>
            <option value="px">px</option>
            <option value="rem">rem</option>
            <option value="em">em</option>
            <option value="vh">vh</option>
            <option value="vw">vw</option>
            <option value="custom">custom</option>
          </select>
        </div>
      )}
    </div>
  );
};

const ResponsiveTextField = ({ label, value, onChange, mobileValue, onMobileChange, placeholder }: any) => {
  const [isMobile, setIsMobile] = useState(false);
  const valStr = ((isMobile ? mobileValue : value) || '').toString();

  const fireChange = (v: string) => {
    if (isMobile && onMobileChange) onMobileChange(v);
    else onChange(v);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
        {onMobileChange && (
          <div style={{ display: 'flex', border: '1px solid #cbd5e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div onClick={() => setIsMobile(false)} style={{ padding: '2px 6px', backgroundColor: !isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>💻</div>
            <div onClick={() => setIsMobile(true)} style={{ padding: '2px 6px', backgroundColor: isMobile ? '#e2e8f0' : '#ffffff', cursor: 'pointer', fontSize: '11px' }}>📱</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e0', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <input type="text" value={valStr} placeholder={placeholder} onChange={(e) => fireChange(e.target.value)} style={{ flex: 1, border: 'none', padding: '8px 12px', fontSize: '13px', outline: 'none' }} />
      </div>
    </div>
  );
};

const ShadowControl = ({ label, value, onChange }: any) => {
  const [popoverActive, setPopoverActive] = useState(false);

  const parse = (val: string) => {
    if (!val || val.includes('rgba') || val.includes(',')) return { x: 0, y: 4, blur: 6, spread: -1, color: '#000000' };
    const parts = val.split(' ');
    if (parts.length >= 5) {
      return { x: parseInt(parts[0]) || 0, y: parseInt(parts[1]) || 0, blur: parseInt(parts[2]) || 0, spread: parseInt(parts[3]) || 0, color: parts[4] || '#000000' };
    }
    return { x: 0, y: 4, blur: 6, spread: -1, color: '#000000' };
  };

  const s = parse(value);
  const update = (key: string, v: string | number) => {
    const n = { ...s, [key]: v };
    onChange(`${n.x}px ${n.y}px ${n.blur}px ${n.spread}px ${n.color}`);
  };

  const hasShadow = value && value !== 'none' && value !== '';

  const activator = (
    <div 
      onClick={() => setPopoverActive(!popoverActive)} 
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #cbd5e0', borderRadius: '6px', padding: '8px 12px', backgroundColor: '#ffffff', cursor: 'pointer' }}
    >
      <span style={{ fontSize: '13px', color: '#2d3748' }}>{hasShadow ? 'Custom Shadow' : 'None'}</span>
      <span style={{ fontSize: '10px', color: '#718096' }}>▾</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
      <span className="custom-label" style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
      <Popover active={popoverActive} activator={activator} onClose={() => setPopoverActive(false)}>
        <Popover.Pane>
          <Box padding="400" minWidth="280px">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Button size="micro" onClick={() => { onChange(''); setPopoverActive(false); }}>Remove Shadow</Button>
            </div>
            <SliderControl label="X Offset" value={`${s.x}px`} onChange={(v:any) => update('x', parseInt(v))} min={-50} max={50} />
            <SliderControl label="Y Offset" value={`${s.y}px`} onChange={(v:any) => update('y', parseInt(v))} min={-50} max={50} />
            <SliderControl label="Blur" value={`${s.blur}px`} onChange={(v:any) => update('blur', parseInt(v))} min={0} max={100} />
            <SliderControl label="Spread" value={`${s.spread}px`} onChange={(v:any) => update('spread', parseInt(v))} min={-50} max={50} />
            <ColorControl label="Color" value={s.color} onChange={(v:any) => update('color', v)} />
          </Box>
        </Popover.Pane>
      </Popover>
    </div>
  );
};

const Accordion = ({ title, children, defaultOpen = true }: any) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
      <div 
        onClick={() => setOpen(!open)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: '12px', userSelect: 'none' }}
      >
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>{title}</span>
        <span style={{ fontSize: '10px', color: '#718096', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>
      {open && <div style={{ paddingBottom: '4px' }}>{children}</div>}
    </div>
  );
};

// Helper to deeply update fields
const updateTree = (nodes: any[], fieldId: string, updateFn: (f: any) => any): any[] => {
  return nodes.map(node => {
    if (node.id === fieldId) {
      return updateFn(node);
    }
    if (node.children) {
      return { ...node, children: updateTree(node.children, fieldId, updateFn) };
    }
    return node;
  });
};

const deleteFromTree = (nodes: any[], fieldId: string): any[] => {
  return nodes.filter(n => n.id !== fieldId).map(n => {
    if (n.children) return { ...n, children: deleteFromTree(n.children, fieldId) };
    return n;
  });
};

const insertAfterInTree = (nodes: any[], targetId: string, newNode: any): any[] => {
  let result: any[] = [];
  for (let n of nodes) {
    result.push(n);
    if (n.id === targetId) {
      result.push(newNode);
    } else if (n.children) {
      result[result.length - 1] = { ...n, children: insertAfterInTree(n.children, targetId, newNode) };
    }
  }
  return result;
};

const findInTree = (nodes: any[], fieldId: string): any | null => {
  for (let n of nodes) {
    if (n.id === fieldId) return n;
    if (n.children) {
      const found = findInTree(n.children, fieldId);
      if (found) return found;
    }
  }
  return null;
};

// Style Resolvers for Responsive Breakpoints
const resolveGlobalStyle = (styles: any, viewMode: string) => {
  if (!styles) return {};
  const isLegacy = !styles.desktop && !styles.tablet && !styles.mobile;
  const desktop = isLegacy ? styles : (styles.desktop || {});
  if (viewMode === 'desktop') return desktop;
  const tablet = styles.tablet || {};
  if (viewMode === 'tablet') return { ...desktop, ...tablet };
  const mobile = styles.mobile || {};
  return { ...desktop, ...tablet, ...mobile };
};

const resolveFieldStyle = (styles: any, viewMode: string, state = 'default') => {
  if (!styles) return {};
  const isLegacy = styles.default && !styles.desktop;
  const desktop = isLegacy ? (styles[state] || {}) : (styles.desktop?.[state] || {});
  if (viewMode === 'desktop') return desktop;
  const tablet = styles.tablet?.[state] || {};
  if (viewMode === 'tablet') return { ...desktop, ...tablet };
  const mobile = styles.mobile?.[state] || {};
  return { ...desktop, ...tablet, ...mobile };
};

const VariablePicker = ({ onSelect }: { onSelect: (val: string) => void }) => {
  const [active, setActive] = useState(false);
  const options = [
    { label: 'Customer Name', value: '{{customer.name}}' },
    { label: 'Customer Email', value: '{{customer.email}}' },
    { label: 'Product Title', value: '{{product.title}}' },
    { label: 'Product Price', value: '{{product.price}}' },
    { label: 'Shop Name', value: '{{shop.name}}' },
    { label: 'Today\'s Date', value: '{{date.today}}' },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setActive(!active)} style={{ background: 'transparent', border: '1px dashed #cbd5e0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#005bd3', cursor: 'pointer', fontWeight: 600 }}>{`{ }`} Insert Variable</button>
      {active && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', width: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#a0aec0', padding: '4px 8px', textTransform: 'uppercase' }}>Variables</div>
          {options.map(o => (
            <div 
              key={o.value} 
              style={{ padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }} 
              onClick={() => { onSelect(o.value); setActive(false); }} 
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#005bd3'; }} 
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'inherit'; }}
            >
              <span>{o.label}</span>
              <span style={{ color: '#a0aec0' }}>+</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FieldGeneralSettings = ({ selectedField, updateSelectedField, onOpenPicker }: any) => {
  if (!selectedField) return <Text as="p" tone="subdued">Select a field on the canvas to edit its settings.</Text>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="custom-label" style={{ fontSize: '16px', marginBottom: '8px' }}>General ({selectedField.type})</div>
      
      {/* Universal settings */}
      {selectedField.type !== 'submit' && selectedField.type !== 'pagebreak' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span className="custom-label" style={{ fontSize: '13px' }}>Label</span>
             <VariablePicker onSelect={(val) => updateSelectedField('label', (selectedField.label || '') + ' ' + val)} />
          </div>
          <TextField labelHidden label="Label" value={selectedField.label || ''} onChange={(v) => updateSelectedField('label', v)} autoComplete="off" />
        </div>
      )}
      
      {/* Placeholder for fields that accept text */}
      {['text', 'email', 'phone', 'url', 'number', 'password', 'textarea'].includes(selectedField.type) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span className="custom-label" style={{ fontSize: '13px' }}>Placeholder</span>
             <VariablePicker onSelect={(val) => updateSelectedField('placeholder', (selectedField.placeholder || '') + ' ' + val)} />
          </div>
          <TextField labelHidden label="Placeholder" value={selectedField.placeholder || ''} onChange={(v) => updateSelectedField('placeholder', v)} autoComplete="off" />
        </div>
      )}
      
      {/* Help Text */}
      {['text', 'email', 'phone', 'url', 'number', 'password', 'textarea'].includes(selectedField.type) && (
        <TextField label="Help Text" value={selectedField.helpText || ''} onChange={(v) => updateSelectedField('helpText', v)} autoComplete="off" />
      )}

      {/* Default Value */}
      {['text', 'email', 'url', 'hidden'].includes(selectedField.type) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span className="custom-label" style={{ fontSize: '13px' }}>Default Value</span>
             <VariablePicker onSelect={(val) => updateSelectedField('defaultValue', (selectedField.defaultValue || '') + ' ' + val)} />
          </div>
          <TextField labelHidden label="Default Value" value={selectedField.defaultValue || ''} onChange={(v) => updateSelectedField('defaultValue', v)} autoComplete="off" />
        </div>
      )}
      
      {/* Text Field specifics */}
      {selectedField.type === 'text' && (
        <>
          <TextField label="Min Length" type="number" value={selectedField.minLength || ''} onChange={(v) => updateSelectedField('minLength', v)} autoComplete="off" />
          <TextField label="Max Length" type="number" value={selectedField.maxLength || ''} onChange={(v) => updateSelectedField('maxLength', v)} autoComplete="off" />
          <TextField label="Validation Pattern (Regex)" value={selectedField.pattern || ''} onChange={(v) => updateSelectedField('pattern', v)} autoComplete="off" />
          <TextField label="Autocomplete" value={selectedField.autocomplete || ''} onChange={(v) => updateSelectedField('autocomplete', v)} autoComplete="off" />
        </>
      )}

      {/* Number specifics */}
      {selectedField.type === 'number' && (
        <>
          <TextField label="Min Value" type="number" value={selectedField.min || ''} onChange={(v) => updateSelectedField('min', v)} autoComplete="off" />
          <TextField label="Max Value" type="number" value={selectedField.max || ''} onChange={(v) => updateSelectedField('max', v)} autoComplete="off" />
          <TextField label="Step" type="number" value={selectedField.step || ''} onChange={(v) => updateSelectedField('step', v)} autoComplete="off" />
          <TextField label="Prefix Text" value={selectedField.prefixText || ''} onChange={(v) => updateSelectedField('prefixText', v)} autoComplete="off" />
          <TextField label="Suffix Text" value={selectedField.suffixText || ''} onChange={(v) => updateSelectedField('suffixText', v)} autoComplete="off" />
        </>
      )}

      {/* Textarea specifics */}
      {selectedField.type === 'textarea' && (
        <>
          <TextField label="Rows" type="number" value={selectedField.rows || '4'} onChange={(v) => updateSelectedField('rows', v)} autoComplete="off" />
          <Checkbox label="Auto-Grow" checked={selectedField.autoGrow || false} onChange={(v) => updateSelectedField('autoGrow', v)} />
          <Checkbox label="Show Character Counter" checked={selectedField.showCounter || false} onChange={(v) => updateSelectedField('showCounter', v)} />
          <TextField label="Max Length" type="number" value={selectedField.maxLength || ''} onChange={(v) => updateSelectedField('maxLength', v)} autoComplete="off" />
        </>
      )}

      {/* Password specifics */}
      {selectedField.type === 'password' && (
        <>
          <Checkbox label="Show/Hide Toggle" checked={selectedField.showToggle || false} onChange={(v) => updateSelectedField('showToggle', v)} />
          <Checkbox label="Password Strength Meter" checked={selectedField.showStrength || false} onChange={(v) => updateSelectedField('showStrength', v)} />
        </>
      )}

      {/* Email specifics */}
      {selectedField.type === 'email' && (
        <Checkbox label="Use as Reply-To" checked={selectedField.useAsReplyTo || false} onChange={(v) => updateSelectedField('useAsReplyTo', v)} />
      )}

      {/* Choice Field Options */}
      {(['dropdown', 'select', 'multiselect', 'radio', 'checkbox', 'buttonselect', 'imagechoice', 'colorswatch'].includes(selectedField.type)) && (
        <div>
          <hr className="divider" style={{ margin: '16px 0' }} />
          <div className="custom-label" style={{ fontSize: '14px', marginBottom: '12px' }}>Options</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(selectedField.options || []).map((opt: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" className="custom-input" style={{ flex: 1 }} 
                    placeholder="Label..."
                    value={opt.label} 
                    onChange={(e) => {
                      const newOpts = [...(selectedField.options || [])];
                      newOpts[idx] = { ...newOpts[idx], label: e.target.value, value: e.target.value };
                      updateSelectedField('options', newOpts);
                    }}
                  />
                  {selectedField.type === 'colorswatch' && (
                    <input 
                      type="color" style={{ width: '30px', height: '30px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }} 
                      value={opt.hex || '#000000'} 
                      onChange={(e) => {
                        const newOpts = [...(selectedField.options || [])];
                        newOpts[idx] = { ...newOpts[idx], hex: e.target.value };
                        updateSelectedField('options', newOpts);
                      }}
                    />
                  )}
                  <div style={{ cursor: 'pointer', padding: '4px', display: 'flex' }} onClick={() => {
                    const newOpts = [...(selectedField.options || [])];
                    newOpts.splice(idx, 1);
                    updateSelectedField('options', newOpts);
                  }}>
                    <Icon source={DeleteIcon} tone="critical" />
                  </div>
                </div>
                
                {selectedField.type === 'imagechoice' && (
                  <input 
                    type="text" className="custom-input" style={{ width: '100%', fontSize: '12px' }} 
                    placeholder="Image URL (e.g. https://...)"
                    value={opt.imageUrl || ''} 
                    onChange={(e) => {
                      const newOpts = [...(selectedField.options || [])];
                      newOpts[idx] = { ...newOpts[idx], imageUrl: e.target.value };
                      updateSelectedField('options', newOpts);
                    }}
                  />
                )}
              </div>
            ))}
            <Button size="micro" onClick={() => {
              const newOpts = [...(selectedField.options || [])];
              const base = { label: `Option ${newOpts.length + 1}`, value: `Option ${newOpts.length + 1}` };
              if (selectedField.type === 'colorswatch') Object.assign(base, { hex: '#005bd3' });
              newOpts.push(base);
              updateSelectedField('options', newOpts);
            }}>Add Option</Button>
          </div>
        </div>
      )}

      {/* Select specifics */}
      {(selectedField.type === 'dropdown' || selectedField.type === 'select' || selectedField.type === 'multiselect') && (
        <>
          <TextField label="Placeholder Text" value={selectedField.selectPlaceholder || 'Select an option...'} onChange={(v) => updateSelectedField('selectPlaceholder', v)} autoComplete="off" />
          {selectedField.type === 'multiselect' && <TextField label="Max Selections" type="number" value={selectedField.maxSelections || ''} onChange={(v) => updateSelectedField('maxSelections', v)} autoComplete="off" />}
          <Checkbox label="Allow Search" checked={selectedField.allowSearch || false} onChange={(v) => updateSelectedField('allowSearch', v)} />
        </>
      )}

      {/* Checkbox specifics */}
      {selectedField.type === 'checkbox' && (
        <>
          <TextField label="Min Selections" type="number" value={selectedField.minSelections || ''} onChange={(v) => updateSelectedField('minSelections', v)} autoComplete="off" />
          <TextField label="Max Selections" type="number" value={selectedField.maxSelections || ''} onChange={(v) => updateSelectedField('maxSelections', v)} autoComplete="off" />
          <Select label="Layout Direction" options={[{label:'Column', value:'column'}, {label:'Row', value:'row'}]} value={selectedField.layoutDirection || 'column'} onChange={(v) => updateSelectedField('layoutDirection', v)} />
        </>
      )}

      {/* Radio specifics */}
      {selectedField.type === 'radio' && (
        <Select label="Layout Direction" options={[{label:'Column', value:'column'}, {label:'Row', value:'row'}]} value={selectedField.layoutDirection || 'column'} onChange={(v) => updateSelectedField('layoutDirection', v)} />
      )}

      {/* Toggle/Switch specifics */}
      {['toggle', 'switch'].includes(selectedField.type) && (
        <>
          <TextField label="On Value" value={selectedField.onValue || 'true'} onChange={(v) => updateSelectedField('onValue', v)} autoComplete="off" />
          <TextField label="Off Value" value={selectedField.offValue || 'false'} onChange={(v) => updateSelectedField('offValue', v)} autoComplete="off" />
          <Checkbox label="Default State (ON)" checked={selectedField.defaultState || false} onChange={(v) => updateSelectedField('defaultState', v)} />
        </>
      )}

      {/* Button Select specifics */}
      {selectedField.type === 'buttonselect' && (
        <Checkbox label="Full Width Buttons" checked={selectedField.fullWidth || false} onChange={(v) => updateSelectedField('fullWidth', v)} />
      )}

      {/* Image Choice specifics */}
      {selectedField.type === 'imagechoice' && (
        <>
          <SliderControl label="Grid Columns" value={selectedField.gridColumns || 3} onChange={(v:any) => updateSelectedField('gridColumns', parseInt(v))} min={1} max={6} defaultUnit="custom" />
          <SliderControl label="Image Height" value={selectedField.imageSize || '100px'} onChange={(v:any) => updateSelectedField('imageSize', v)} min={50} max={300} defaultUnit="px" />
        </>
      )}

      {/* Color Swatch specifics */}
      {selectedField.type === 'colorswatch' && (
        <>
          <Select label="Swatch Shape" options={[{label:'Square',value:'square'},{label:'Circle',value:'circle'}]} value={selectedField.swatchShape || 'circle'} onChange={(v) => updateSelectedField('swatchShape', v)} />
          <SliderControl label="Swatch Size" value={selectedField.swatchSize || '32px'} onChange={(v:any) => updateSelectedField('swatchSize', v)} min={16} max={80} defaultUnit="px" />
          <Checkbox label="Show Labels" checked={selectedField.showLabel !== false} onChange={(v) => updateSelectedField('showLabel', v)} />
        </>
      )}

      {/* Media Field specifics */}
      {(['file', 'imageupload', 'videoupload'].includes(selectedField.type)) && (
        <>
          <SliderControl label="Max File Size" value={selectedField.maxFileSize || (selectedField.type === 'videoupload' ? '100' : '10')} onChange={(v:any) => updateSelectedField('maxFileSize', parseInt(v))} min={1} max={500} defaultUnit="MB" />
          <TextField label="Allowed Formats" value={selectedField.allowedFormats || ''} onChange={(v) => updateSelectedField('allowedFormats', v)} autoComplete="off" placeholder="e.g. .jpg, .png, .pdf" />
        </>
      )}

      {selectedField.type === 'imageupload' && (
        <Checkbox label="Show Preview" checked={selectedField.previewUpload !== false} onChange={(v) => updateSelectedField('previewUpload', v)} />
      )}

      {selectedField.type === 'signature' && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <label className="custom-label" style={{ display: 'block', marginBottom: '4px' }}>Pen Color</label>
            <input type="color" value={selectedField.penColor || '#000000'} onChange={(e) => updateSelectedField('penColor', e.target.value)} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label className="custom-label" style={{ display: 'block', marginBottom: '4px' }}>Canvas Background</label>
            <input type="color" value={selectedField.canvasBg || '#ffffff'} onChange={(e) => updateSelectedField('canvasBg', e.target.value)} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
          <SliderControl label="Canvas Height" value={selectedField.canvasHeight || '150px'} onChange={(v:any) => updateSelectedField('canvasHeight', v)} min={100} max={400} defaultUnit="px" />
          <Checkbox label="Show Clear Button" checked={selectedField.showClearButton !== false} onChange={(v) => updateSelectedField('showClearButton', v)} />
          <Checkbox label="Show Border" checked={selectedField.showBorder !== false} onChange={(v) => updateSelectedField('showBorder', v)} />
        </>
      )}

      {selectedField.type === 'camera' && (
        <Select label="Camera Facing" options={[{label:'User Choice',value:'any'},{label:'Front (Selfie)',value:'user'},{label:'Back (Environment)',value:'environment'}]} value={selectedField.cameraFacing || 'any'} onChange={(v) => updateSelectedField('cameraFacing', v)} />
      )}

      {/* Content Field specifics */}
      {selectedField.type === 'heading' && (
        <>
          <Select label="Heading Level" options={[{label:'H1',value:'h1'},{label:'H2',value:'h2'},{label:'H3',value:'h3'},{label:'H4',value:'h4'}]} value={selectedField.level || 'h2'} onChange={(v) => updateSelectedField('level', v)} />
        </>
      )}

      {selectedField.type === 'paragraph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span className="custom-label" style={{ fontSize: '13px' }}>Content</span>
             <VariablePicker onSelect={(val) => updateSelectedField('placeholder', (selectedField.placeholder || '') + ' ' + val)} />
          </div>
          <TextField labelHidden label="Content" value={selectedField.placeholder || ''} onChange={(v) => updateSelectedField('placeholder', v)} autoComplete="off" multiline={4} />
        </div>
      )}

      {selectedField.type === 'html' && (
        <>
          <TextField label="HTML Code" value={selectedField.htmlCode || ''} onChange={(v) => updateSelectedField('htmlCode', v)} autoComplete="off" multiline={6} />
          <Checkbox label="Sanitize HTML (Recommended)" checked={selectedField.sanitize !== false} onChange={(v) => updateSelectedField('sanitize', v)} />
        </>
      )}

      {selectedField.type === 'shortcode' && (
        <>
          <TextField label="Shortcode" value={selectedField.shortcode || ''} onChange={(v) => updateSelectedField('shortcode', v)} autoComplete="off" />
        </>
      )}

      {selectedField.type === 'image' && (
        <>
          <AssetPickerControl label="Image" value={selectedField.imageUrl || ''} onOpenPicker={() => onOpenPicker('media', (url: string) => updateSelectedField('imageUrl', url))} onRemove={() => updateSelectedField('imageUrl', '')} type="media" />
          <Select label="Alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={selectedField.imageAlign || 'center'} onChange={(v) => updateSelectedField('imageAlign', v)} />
          <SliderControl label="Width" value={selectedField.imageWidth || '100%'} onChange={(v:any) => updateSelectedField('imageWidth', v)} min={0} max={100} defaultUnit="%" />
        </>
      )}

      {selectedField.type === 'divider' && (
        <>
          <Select label="Style" options={[{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'},{label:'Dotted',value:'dotted'}]} value={selectedField.dividerStyle || 'solid'} onChange={(v) => updateSelectedField('dividerStyle', v)} />
          <SliderControl label="Thickness" value={selectedField.dividerThickness || '1px'} onChange={(v:any) => updateSelectedField('dividerThickness', v)} min={1} max={10} defaultUnit="px" />
          <SliderControl label="Width" value={selectedField.dividerWidth || '100%'} onChange={(v:any) => updateSelectedField('dividerWidth', v)} min={0} max={100} defaultUnit="%" />
          <div style={{ marginTop: '12px' }}>
            <label className="custom-label" style={{ display: 'block', marginBottom: '4px' }}>Divider Color</label>
            <input type="color" value={selectedField.dividerColor || '#e2e8f0'} onChange={(e) => updateSelectedField('dividerColor', e.target.value)} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
        </>
      )}

      {selectedField.type === 'spacer' && (
        <>
          <SliderControl label="Height" value={selectedField.spacerHeight || '30px'} onChange={(v:any) => updateSelectedField('spacerHeight', v)} min={10} max={200} defaultUnit="px" />
        </>
      )}

      {/* Advanced Field specifics */}
      {(selectedField.type === 'date' || selectedField.type === 'time') && (
        <Select label="Format" options={selectedField.type === 'date' ? [{label:'MM/DD/YYYY',value:'mmddyyyy'},{label:'YYYY-MM-DD',value:'yyyymmdd'}] : [{label:'12hr (AM/PM)',value:'12hr'},{label:'24hr',value:'24hr'}]} value={selectedField.format || (selectedField.type === 'date' ? 'mmddyyyy' : '12hr')} onChange={(v) => updateSelectedField('format', v)} />
      )}

      {selectedField.type === 'address' && (
        <>
          <Checkbox label="Show Street" checked={selectedField.showStreet !== false} onChange={(v) => updateSelectedField('showStreet', v)} />
          <Checkbox label="Show City" checked={selectedField.showCity !== false} onChange={(v) => updateSelectedField('showCity', v)} />
          <Checkbox label="Show State / Province" checked={selectedField.showState !== false} onChange={(v) => updateSelectedField('showState', v)} />
          <Checkbox label="Show ZIP / Postal" checked={selectedField.showZip !== false} onChange={(v) => updateSelectedField('showZip', v)} />
          <Checkbox label="Show Country" checked={selectedField.showCountry !== false} onChange={(v) => updateSelectedField('showCountry', v)} />
        </>
      )}

      {selectedField.type === 'calculated' && (
        <>
          <TextField label="Formula" value={selectedField.formula || ''} onChange={(v) => updateSelectedField('formula', v)} autoComplete="off" placeholder="{quantity} * {price}" />
          <TextField label="Prefix Text" value={selectedField.prefixText || ''} onChange={(v) => updateSelectedField('prefixText', v)} autoComplete="off" placeholder="$" />
          <TextField label="Suffix Text" value={selectedField.suffixText || ''} onChange={(v) => updateSelectedField('suffixText', v)} autoComplete="off" placeholder="USD" />
        </>
      )}

      {(selectedField.type === 'slider' || selectedField.type === 'quantity') && (
        <>
          <TextField label="Min Value" type="number" value={selectedField.minVal || '0'} onChange={(v) => updateSelectedField('minVal', v)} autoComplete="off" />
          <TextField label="Max Value" type="number" value={selectedField.maxVal || (selectedField.type === 'slider' ? '100' : '10')} onChange={(v) => updateSelectedField('maxVal', v)} autoComplete="off" />
          <TextField label="Step" type="number" value={selectedField.stepVal || '1'} onChange={(v) => updateSelectedField('stepVal', v)} autoComplete="off" />
        </>
      )}

      {selectedField.type === 'captcha' && (
        <Select label="CAPTCHA Type" options={[{label:'reCAPTCHA v2',value:'recaptchav2'},{label:'reCAPTCHA v3 (Invisible)',value:'recaptchav3'},{label:'Honeypot',value:'honeypot'},{label:'Math Challenge',value:'math'}]} value={selectedField.captchaType || 'recaptchav2'} onChange={(v) => updateSelectedField('captchaType', v)} />
      )}

      {/* Commerce Field specifics */}
      {(selectedField.type === 'product' || selectedField.type === 'variant' || selectedField.type === 'collection') && (
        <>
          {selectedField.type === 'product' && <Checkbox label="Show Price" checked={selectedField.showPrice !== false} onChange={(v) => updateSelectedField('showPrice', v)} />}
          {selectedField.type === 'product' && <Checkbox label="Allow Quantity" checked={selectedField.allowQuantity || false} onChange={(v) => updateSelectedField('allowQuantity', v)} />}
        </>
      )}

      {selectedField.type === 'discount' && (
        <Checkbox label="Auto Apply to Cart" checked={selectedField.autoApply || false} onChange={(v) => updateSelectedField('autoApply', v)} />
      )}

      {selectedField.type === 'price' && (
        <>
          <TextField label="Currency Symbol" value={selectedField.currencySymbol || '$'} onChange={(v) => updateSelectedField('currencySymbol', v)} autoComplete="off" />
          <Select label="Symbol Position" options={[{label:'Before',value:'before'},{label:'After',value:'after'}]} value={selectedField.currencyPosition || 'before'} onChange={(v) => updateSelectedField('currencyPosition', v)} />
        </>
      )}

      {selectedField.type === 'customer' && (
        <>
          <Checkbox label="Auto-detect Logged In User" checked={selectedField.autoDetect !== false} onChange={(v) => updateSelectedField('autoDetect', v)} />
          <Checkbox label="Create Account on Submit" checked={selectedField.createAccount || false} onChange={(v) => updateSelectedField('createAccount', v)} />
          <TextField label="Customer Tag on Submit" value={selectedField.customerTag || ''} onChange={(v) => updateSelectedField('customerTag', v)} autoComplete="off" placeholder="e.g. wholesale-applicant" />
        </>
      )}

      {selectedField.type === 'metafield' && (
        <>
          <Select label="Target" options={[{label:'Product',value:'product'},{label:'Customer',value:'customer'},{label:'Order',value:'order'}]} value={selectedField.metafieldTarget || 'product'} onChange={(v) => updateSelectedField('metafieldTarget', v)} />
          <TextField label="Namespace" value={selectedField.metafieldNamespace || ''} onChange={(v) => updateSelectedField('metafieldNamespace', v)} autoComplete="off" placeholder="e.g. custom" />
          <TextField label="Key" value={selectedField.metafieldKey || ''} onChange={(v) => updateSelectedField('metafieldKey', v)} autoComplete="off" placeholder="e.g. age_verified" />
        </>
      )}

      {/* Survey & Feedback specifics */}
      {selectedField.type === 'rating' && (
        <>
          <Select label="Max Stars" options={[{label:'5 Stars',value:'5'},{label:'10 Stars',value:'10'}]} value={String(selectedField.maxStars || '5')} onChange={(v) => updateSelectedField('maxStars', parseInt(v))} />
          <Select label="Icon Shape" options={[{label:'Star ★',value:'star'},{label:'Heart ♥',value:'heart'},{label:'Thumb 👍',value:'thumb'}]} value={selectedField.ratingIcon || 'star'} onChange={(v) => updateSelectedField('ratingIcon', v)} />
          <div style={{ marginTop: '12px' }}>
            <label className="custom-label" style={{ display: 'block', marginBottom: '4px' }}>Active Color</label>
            <input type="color" value={selectedField.ratingColor || '#fbbf24'} onChange={(e) => updateSelectedField('ratingColor', e.target.value)} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }} />
          </div>
        </>
      )}

      {selectedField.type === 'nps' && (
        <>
          <Select label="Scale Type" options={[{label:'0 to 10',value:'0-10'},{label:'1 to 10',value:'1-10'}]} value={selectedField.npsScale || '0-10'} onChange={(v) => updateSelectedField('npsScale', v)} />
          <TextField label="Left Label (Low Score)" value={selectedField.npsLeftLabel || ''} onChange={(v) => updateSelectedField('npsLeftLabel', v)} autoComplete="off" placeholder="Not at all likely" />
          <TextField label="Right Label (High Score)" value={selectedField.npsRightLabel || ''} onChange={(v) => updateSelectedField('npsRightLabel', v)} autoComplete="off" placeholder="Extremely likely" />
        </>
      )}

      {selectedField.type === 'scale' && (
        <>
          <Select label="Scale Range" options={[{label:'1 to 5',value:'5'},{label:'1 to 7',value:'7'},{label:'1 to 10',value:'10'}]} value={String(selectedField.scaleRange || '5')} onChange={(v) => updateSelectedField('scaleRange', parseInt(v))} />
          <TextField label="Left Label" value={selectedField.scaleLeftLabel || ''} onChange={(v) => updateSelectedField('scaleLeftLabel', v)} autoComplete="off" placeholder="Strongly Disagree" />
          <TextField label="Right Label" value={selectedField.scaleRightLabel || ''} onChange={(v) => updateSelectedField('scaleRightLabel', v)} autoComplete="off" placeholder="Strongly Agree" />
          <Checkbox label="Show Numbers Inside" checked={selectedField.showScaleNumbers !== false} onChange={(v) => updateSelectedField('showScaleNumbers', v)} />
        </>
      )}

      {selectedField.type === 'matrix' && (
        <>
          <TextField label="Rows (Comma separated)" value={(selectedField.matrixRows || ['Product Quality', 'Customer Service', 'Delivery Speed']).join(', ')} onChange={(v) => updateSelectedField('matrixRows', v.split(',').map((s:string)=>s.trim()))} autoComplete="off" multiline={3} />
          <TextField label="Columns (Comma separated)" value={(selectedField.matrixCols || ['Poor', 'Fair', 'Good', 'Excellent']).join(', ')} onChange={(v) => updateSelectedField('matrixCols', v.split(',').map((s:string)=>s.trim()))} autoComplete="off" multiline={2} />
          <Select label="Selection Type per Row" options={[{label:'Single Choice (Radio)',value:'radio'},{label:'Multiple Choice (Checkbox)',value:'checkbox'}]} value={selectedField.matrixSelection || 'radio'} onChange={(v) => updateSelectedField('matrixSelection', v)} />
        </>
      )}

      {selectedField.type === 'ranking' && (
        <>
          <TextField label="Items to Rank (Comma separated)" value={(selectedField.rankingItems || ['Option A', 'Option B', 'Option C']).join(', ')} onChange={(v) => updateSelectedField('rankingItems', v.split(',').map((s:string)=>s.trim()))} autoComplete="off" multiline={3} />
          <Checkbox label="Show Rank Numbers" checked={selectedField.showRankNumbers !== false} onChange={(v) => updateSelectedField('showRankNumbers', v)} />
        </>
      )}

      {selectedField.type === 'sentiment' && (
        <>
          <TextField label="Emojis (Comma separated)" value={(selectedField.sentimentEmojis || ['😡', '😞', '😐', '😊', '😍']).join(', ')} onChange={(v) => updateSelectedField('sentimentEmojis', v.split(',').map((s:string)=>s.trim()))} autoComplete="off" />
        </>
      )}

      {/* Payment & Legal specifics */}
      {selectedField.type === 'payment' && (
        <>
          <TextField label="Payment Amount" type="number" value={selectedField.paymentAmount || '0.00'} onChange={(v) => updateSelectedField('paymentAmount', v)} autoComplete="off" />
          <TextField label="Currency Symbol" value={selectedField.currencySymbol || '$'} onChange={(v) => updateSelectedField('currencySymbol', v)} autoComplete="off" />
          <Checkbox label="Test Mode" checked={selectedField.testMode !== false} onChange={(v) => updateSelectedField('testMode', v)} />
        </>
      )}

      {selectedField.type === 'terms' && (
        <>
          <TextField label="Link Text" value={selectedField.termsLinkText || 'Terms and Conditions'} onChange={(v) => updateSelectedField('termsLinkText', v)} autoComplete="off" />
          <TextField label="Link URL" value={selectedField.termsLinkUrl || ''} onChange={(v) => updateSelectedField('termsLinkUrl', v)} autoComplete="off" placeholder="https://..." />
        </>
      )}

      {selectedField.type === 'age' && (
        <>
          <TextField label="Minimum Age" type="number" value={selectedField.minAge || '18'} onChange={(v) => updateSelectedField('minAge', v)} autoComplete="off" />
          <Checkbox label="Block Submission if Underage" checked={selectedField.blockUnderage !== false} onChange={(v) => updateSelectedField('blockUnderage', v)} />
        </>
      )}

      {selectedField.type === 'gdpr' && (
        <>
          <Checkbox label="Include Email Marketing" checked={selectedField.gdprEmail !== false} onChange={(v) => updateSelectedField('gdprEmail', v)} />
          <Checkbox label="Include SMS Marketing" checked={selectedField.gdprSms || false} onChange={(v) => updateSelectedField('gdprSms', v)} />
          <Checkbox label="Include Cookies/Analytics" checked={selectedField.gdprCookies !== false} onChange={(v) => updateSelectedField('gdprCookies', v)} />
        </>
      )}

      {selectedField.type === 'agreement' && (
        <>
          <TextField label="Agreement Text" value={selectedField.agreementText || ''} onChange={(v) => updateSelectedField('agreementText', v)} autoComplete="off" multiline={4} />
          <Checkbox label="Auto-stamp Date" checked={selectedField.autoStampDate !== false} onChange={(v) => updateSelectedField('autoStampDate', v)} />
        </>
      )}

      {selectedField.type === 'hidden' && (
        <>
          <TextField label="Internal Key (Name)" value={selectedField.hiddenKey || ''} onChange={(v) => updateSelectedField('hiddenKey', v)} autoComplete="off" placeholder="e.g., utm_source" />
          <TextField label="Static Value" value={selectedField.hiddenValue || ''} onChange={(v) => updateSelectedField('hiddenValue', v)} autoComplete="off" placeholder="Value..." />
        </>
      )}

      {selectedField.type === 'url' && (
        <>
          <Checkbox label="Force HTTPS" checked={selectedField.forceHttps !== false} onChange={(v) => updateSelectedField('forceHttps', v)} />
        </>
      )}

      {/* Container Layout specifics */}
      {selectedField.type === 'container' && (
        <Select label="Flex Direction" options={[{label:'Column', value:'column'}, {label:'Row', value:'row'}]} value={selectedField.direction || 'column'} onChange={(v) => updateSelectedField('direction', v)} />
      )}

      <hr className="divider" style={{ margin: '16px 0' }} />
      <SliderControl label="Width" value={selectedField.width || '100%'} onChange={(v:any) => updateSelectedField('width', v)} min={0} max={100} defaultUnit="%" />
      
      {!['container', 'heading', 'paragraph', 'html', 'shortcode', 'image', 'divider', 'spacer', 'submit', 'hidden'].includes(selectedField.type) && (
        <InlineStack align="space-between">
          <Text as="span">Required field</Text>
          <Checkbox label="" checked={selectedField.required} onChange={(v) => updateSelectedField('required', v)} />
        </InlineStack>
      )}
    </div>
  );
};

function IconPickerModal({ open, onClose, onSelect }: { open: boolean, onClose: () => void, onSelect: (url: string) => void }) {
  const [activeTab, setActiveTab] = useState<'built-in' | 'custom'>('built-in');
  const [search, setSearch] = useState("");
  
  const [customIcons, setCustomIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && activeTab === 'custom') {
      setLoading(true);
      fetch('/api/files').then(r => r.json()).then(d => {
        setCustomIcons((d.images || []).filter((u: string) => u.toLowerCase().endsWith('.svg') || u.toLowerCase().endsWith('.png')));
        setLoading(false);
      });
    }
  }, [open, activeTab]);

  if (!open) return null;

  const builtInIcons = [
    { name: 'Checkmark', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/checkmark.svg' },
    { name: 'Chevron Down', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/chevron-down.svg' },
    { name: 'Chevron Up', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/chevron-up.svg' },
    { name: 'Chevron Left', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/chevron-left.svg' },
    { name: 'Chevron Right', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/chevron-right.svg' },
    { name: 'Star', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/star.svg' },
    { name: 'Heart', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/heart.svg' },
    { name: 'Thumbs Up', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/thumbs-up.svg' },
    { name: 'Search', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/search.svg' },
    { name: 'Cart', url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/cart.svg' },
  ];

  const filteredIcons = builtInIcons.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', width: '80%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Text as="h2" variant="headingLg" fontWeight="bold">Select Icon</Text>
          <Button variant="plain" onClick={onClose}>Close</Button>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <Button pressed={activeTab === 'built-in'} onClick={() => setActiveTab('built-in')}>Built-in Icons</Button>
          <Button pressed={activeTab === 'custom'} onClick={() => setActiveTab('custom')}>Custom (Files)</Button>
        </div>

        {activeTab === 'built-in' && (
          <div style={{ marginBottom: '16px' }}>
            <TextField labelHidden label="Search Icons" placeholder="Search built-in icons..." value={search} onChange={setSearch} autoComplete="off" />
          </div>
        )}

        <Scrollable style={{ flex: 1 }}>
          {activeTab === 'built-in' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
              {filteredIcons.map((ico, i) => (
                <div key={i} onClick={() => { onSelect(ico.url); onClose(); }} style={{ cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <img src={ico.url} style={{ width: '32px', height: '32px', objectFit: 'contain', marginBottom: '8px' }} alt={ico.name} />
                  <span style={{ fontSize: '11px', textAlign: 'center', color: '#4b5563' }}>{ico.name}</span>
                </div>
              ))}
            </div>
          ) : loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
          ) : customIcons.length === 0 ? (
            <Text as="p" tone="subdued">No custom SVG or PNG icons found in your Shopify Media library.</Text>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {customIcons.map((img, i) => (
                <div key={i} onClick={() => { onSelect(img); onClose(); }} style={{ cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <img src={img} style={{ width: '48px', height: '48px', objectFit: 'contain' }} alt="Media" />
                </div>
              ))}
            </div>
          )}
        </Scrollable>
      </div>
    </div>
  );
}

function MediaPickerModal({ open, onClose, onSelect }: { open: boolean, onClose: () => void, onSelect: (url: string) => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch('/api/files').then(r => r.json()).then(d => {
        setImages(d.images || []);
        setLoading(false);
      });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', width: '80%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Text as="h2" variant="headingLg" fontWeight="bold">Select Image from Media</Text>
          <Button variant="plain" onClick={onClose}>Close</Button>
        </div>
        <Scrollable style={{ flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spinner /></div>
          ) : images.length === 0 ? (
            <Text as="p" tone="subdued">No images found in your Shopify Media library.</Text>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => { onSelect(img); onClose(); }} style={{ cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <img src={img} style={{ width: '100%', height: '120px', objectFit: 'cover' }} alt="Media" />
                </div>
              ))}
            </div>
          )}
        </Scrollable>
      </div>
    </div>
  );
}

export default function FormBuilder() {
  const { form, plan } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const nav = useNavigation();
  const isSaving = nav.state === "submitting";

  const [title, setTitle] = useState(form.title);
  
  const { state: formState, set: setFormState, undo, redo, canUndo, canRedo } = useUndoableState({
    fields: form.fields || [],
    globalStyles: form.globalStyles || {}
  });

  const fields = formState.fields;
  const globalStyles = formState.globalStyles;

  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [styleState, setStyleState] = useState<'default' | 'hover' | 'focus' | 'error' | 'disabled'>('default');
  const resolvedGlobalStyles = resolveGlobalStyle(globalStyles, viewMode);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState(0); 
  const [rightTab, setRightTab] = useState('general'); 
  const [currentStep, setCurrentStep] = useState(0); 

  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePicker, setActivePicker] = useState<{ type: 'media' | 'icon', callback: (url: string) => void } | null>(null);
  const [lastSavedState, setLastSavedState] = useState(JSON.stringify({ title: form.title, fields: form.fields || [], globalStyles: form.globalStyles || {} }));
  const [formCustomClass, setFormCustomClass] = useState("");
  const [globalCustomCss, setGlobalCustomCss] = useState("");
  
  const hasUnsavedChanges = JSON.stringify({ title, fields, globalStyles }) !== lastSavedState;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    // Component mounted, the custom-full-screen-modal will swipe in automatically via CSS.
  }, []);

  const handleSave = () => {
    const payload = { title, fields, globalStyles };
    submit({ payload: JSON.stringify(payload) }, { method: "post" });
    setLastSavedState(JSON.stringify(payload));
  };

  const addWidget = (type: string, label: string) => {
    const safeId = Math.random().toString(36).substring(7);
    const newField = { 
      id: safeId, 
      type, 
      label, 
      width: '100%',
      uniqueClass: `nf-field-${safeId}`,
      children: type === 'container' ? [] : undefined,
      styles: { desktop: { default: {} } },
      ...(type === 'select' || type === 'radio' || type === 'checkbox' ? { options: [{ label: 'Option 1', value: 'Option 1' }, { label: 'Option 2', value: 'Option 2' }] } : {})
    };
    
    let newFields = [...fields];
    const submitIndex = newFields.findIndex(f => f.type === 'submit');
    if (submitIndex !== -1 && type !== 'submit') {
      newFields.splice(submitIndex, 0, newField);
    } else {
      newFields.push(newField);
    }
    
    setFormState({ ...formState, fields: newFields });
    setSelectedFieldId(newField.id);
    setRightTab('general');
  };

  const duplicateField = (field: any) => {
    const safeId = Math.random().toString(36).substring(7);
    const newField = { ...JSON.parse(JSON.stringify(field)), id: safeId, uniqueClass: `nf-field-${safeId}` };
    setFormState({ ...formState, fields: insertAfterInTree(fields, field.id, newField) });
    setSelectedFieldId(newField.id);
  };

  const deleteField = (id: string) => {
    setFormState({ ...formState, fields: deleteFromTree(fields, id) });
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const updateSelectedField = (key: string, value: any) => {
    if (!selectedFieldId) return;
    setFormState({ 
      ...formState, 
      fields: updateTree(fields, selectedFieldId, (f) => ({ ...f, [key]: value })) 
    });
  };

  const updateGlobalStyle = (key: string, value: any, stateName: string = 'default') => {
    const finalKey = stateName === 'default' ? key : `${key}_${stateName}`;
    const isLegacy = !globalStyles.desktop && !globalStyles.tablet && !globalStyles.mobile;
    const base = isLegacy ? { desktop: { ...globalStyles } } : { ...globalStyles };
    setFormState({ 
      ...formState, 
      globalStyles: { ...base, [viewMode]: { ...(base[viewMode] || {}), [finalKey]: value } } 
    });
  };

  const updateSelectedFieldStyle = (key: string, value: any, state = 'default') => {
    if (!selectedFieldId) return;
    const f = findInTree(fields, selectedFieldId);
    if (!f) return;
    const styles = f.styles || {};
    const isLegacy = styles.default && !styles.desktop;
    const baseStyles = isLegacy ? { desktop: { default: styles.default } } : { ...styles };
    const newStyles = {
      ...baseStyles,
      [viewMode]: {
        ...(baseStyles[viewMode] || {}),
        [state]: { ...(baseStyles[viewMode]?.[state] || {}), [key]: value }
      }
    };
    setFormState({ 
      ...formState, 
      fields: updateTree(fields, selectedFieldId, (node) => ({ ...node, styles: newStyles })) 
    });
  };

  // Advanced Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedFieldId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFieldId !== id) setDragOverFieldId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dragging from sidebar
    const widgetType = e.dataTransfer.getData('widgetType');
    const widgetLabel = e.dataTransfer.getData('widgetLabel');
    
    let draggedNode = null;
    let newTree = [...fields];

    if (widgetType) {
       // Create a new field from the sidebar drag
       const safeId = Math.random().toString(36).substring(7);
       draggedNode = { 
         id: safeId, 
         type: widgetType, 
         label: widgetLabel, 
         width: '100%',
         uniqueClass: `nf-field-${safeId}`,
         children: widgetType === 'container' ? [] : undefined,
         styles: { desktop: { default: {} } },
         ...(widgetType === 'select' || widgetType === 'radio' || widgetType === 'checkbox' ? { options: [{ label: 'Option 1', value: 'Option 1' }, { label: 'Option 2', value: 'Option 2' }] } : {})
       };
    } else {
       if (!draggedFieldId || draggedFieldId === targetId) {
         setDragOverFieldId(null);
         return;
       }
       draggedNode = findInTree(fields, draggedFieldId);
       if (!draggedNode) return;
       newTree = deleteFromTree(fields, draggedFieldId);
    }
    
    // Insert logic
    const insertIntoTree = (nodes: any[]): any[] => {
      let result: any[] = [];
      for (let n of nodes) {
        if (n.id === targetId) {
          if (n.type === 'container') {
            result.push({ ...n, children: [...(n.children || []), draggedNode] });
          } else {
            result.push(draggedNode, n); // insert before
          }
        } else {
          result.push(n.children ? { ...n, children: insertIntoTree(n.children) } : n);
        }
      }
      return result;
    };
    
    // Check if target is top level empty space (appends)
    if (targetId === 'root') {
      newTree.push(draggedNode);
    } else {
      newTree = insertIntoTree(newTree);
    }

    setFormState({ ...formState, fields: newTree });
    setDraggedFieldId(null);
    setDragOverFieldId(null);
    if (widgetType) {
      setSelectedFieldId(draggedNode.id);
      setRightTab('general');
    }
  };

  const handleDragEnd = () => {
    setDraggedFieldId(null);
    setDragOverFieldId(null);
  };

  const selectedField = findInTree(fields, selectedFieldId || '');

  const filteredWidgets = WIDGETS.map(cat => ({
    ...cat,
    items: cat.items.filter(w => w.label.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(cat => cat.items.length > 0);

  const renderField = (f: any) => {
    const isSelected = selectedFieldId === f.id;
    const isOver = dragOverFieldId === f.id;
    const isDragged = draggedFieldId === f.id;
    
    const fStyles = resolveFieldStyle(f.styles, viewMode);
    const fHoverStyles = resolveFieldStyle(f.styles, viewMode, 'hover');
    const fFocusStyles = resolveFieldStyle(f.styles, viewMode, 'focus');
    const hasResponsiveOverrides = (f.styles?.tablet && Object.keys(f.styles.tablet.default || {}).length > 0) || (f.styles?.mobile && Object.keys(f.styles.mobile.default || {}).length > 0);
    
    const isFloating = f.floatingLabel;
    const basePadding = fStyles.padding || resolvedGlobalStyles.input_padding || '12px 16px';
    const borderStyle = resolvedGlobalStyles.input_border_style || 'solid';
    const borderWidth = resolvedGlobalStyles.input_border_width || '1px';

    // Generate dynamic CSS for Hover/Focus states
    let customCSS = '';
    const buildCSSRules = (styles: any, state: string) => {
      let rules = '';
      const bg = styles.bg || resolvedGlobalStyles[`input_bg_${state}`];
      if (bg) rules += `background-color: ${bg} !important;`;
      const borderColor = styles.borderColor || resolvedGlobalStyles[`input_border_${state}`];
      if (borderColor) rules += `border-color: ${borderColor} !important;`;
      const shadow = styles.boxShadow || resolvedGlobalStyles[`input_shadow_${state}`];
      if (shadow) rules += `box-shadow: ${shadow} !important;`;
      const bw = resolvedGlobalStyles[`input_border_width_${state}`];
      if (bw) rules += `border-width: ${bw} !important;`;
      const bs = resolvedGlobalStyles[`input_border_style_${state}`];
      if (bs) rules += `border-style: ${bs} !important;`;
      return rules;
    };
    
    const hoverRules = buildCSSRules(fHoverStyles, 'hover');
    if (hoverRules) customCSS += `.${f.uniqueClass} .nf-input-wrapper:hover { ${hoverRules} }\n`;
    const focusRules = buildCSSRules(fFocusStyles, 'focus');
    if (focusRules) customCSS += `.${f.uniqueClass} .nf-input-wrapper:focus-within { ${focusRules} }\n`;

    // Animations
    const hoverAnim = resolvedGlobalStyles.input_hover_anim;
    if (hoverAnim === 'scale-up') customCSS += `.${f.uniqueClass} .nf-input-wrapper { transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; }\n.${f.uniqueClass} .nf-input-wrapper:hover { transform: scale(1.02); }`;
    if (hoverAnim === 'float') customCSS += `.${f.uniqueClass} .nf-input-wrapper { transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; }\n.${f.uniqueClass} .nf-input-wrapper:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important; }`;
    if (!hoverAnim) customCSS += `.${f.uniqueClass} .nf-input-wrapper { transition: all 0.2s ease; }\n`;
    
    const focusAnim = resolvedGlobalStyles.input_focus_anim;
    if (focusAnim === 'pulse') customCSS += `@keyframes pulse-${f.uniqueClass} { 0% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(66, 153, 225, 0); } 100% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0); } }\n.${f.uniqueClass} .nf-input-wrapper:focus-within { animation: pulse-${f.uniqueClass} 1.5s infinite; }`;
    if (focusAnim === 'glow') customCSS += `.${f.uniqueClass} .nf-input-wrapper:focus-within { box-shadow: 0 0 8px 2px rgba(66, 153, 225, 0.6) !important; }`;

    return (
      <div 
        key={f.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, f.id)}
        onDragOver={(e) => handleDragOver(e, f.id)}
        onDrop={(e) => handleDrop(e, f.id)}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.stopPropagation(); setSelectedFieldId(f.id); setRightTab('general'); }}
        className={`nf-field nf-field-${f.type} ${f.uniqueClass}`}
        style={{ 
          flex: f.width === '50%' ? `0 0 calc(50% - ${(parseInt(resolvedGlobalStyles.gap || '16') / 2)}px)` : '0 0 100%',
          padding: f.type === 'container' ? '0' : '12px', 
          border: isSelected ? '2px solid #005bd3' : '2px solid transparent',
          borderRadius: f.type === 'container' ? (fStyles.radius || '8px') : '8px',
          cursor: 'pointer',
          position: 'relative',
          transition: 'border-color 0.2s, background-color 0.2s',
          boxSizing: 'border-box',
          maxWidth: '100%',
          opacity: isDragged ? 0.5 : 1,
          backgroundColor: isOver ? 'var(--p-color-bg-surface-hover)' : (f.type === 'container' ? fStyles.bg || '#f9fafb' : 'transparent'),
          ...(f.type === 'container' && {
            display: 'flex', 
            flexDirection: f.direction || 'column', 
            gap: fStyles.gap || f.gap || '16px',
            padding: fStyles.padding || f.padding || '16px',
            margin: fStyles.margin || '0',
            boxShadow: fStyles.boxShadow || 'none',
            border: isSelected ? '2px dashed #005bd3' : '2px dashed #cbd5e0',
            alignItems: f.alignItems || 'stretch',
            flexWrap: 'wrap'
          })
        }}
        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = '#005bd3'; }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = f.type === 'container' ? '#cbd5e0' : 'transparent'; }}
      >
        {customCSS && <style dangerouslySetInnerHTML={{ __html: customCSS }} />}
        
        {/* Breakpoint Override Badge */}
        {hasResponsiveOverrides && (
          <div style={{ position: 'absolute', top: '-10px', left: '12px', backgroundColor: 'var(--p-color-bg-surface-brand)', color: 'var(--p-color-text-inverse)', borderRadius: '12px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 11, pointerEvents: 'none' }}>
            <Icon source={f.styles?.mobile && Object.keys(f.styles.mobile.default || {}).length > 0 ? MobileIcon : DesktopIcon} tone="textInverse" /> Overrides
          </div>
        )}
        {/* Floating Toolbar */}
        {isSelected && (
          <div style={{
            position: 'absolute', top: '-18px', right: '12px',
            backgroundColor: 'var(--p-color-bg-surface-brand)',
            borderRadius: '6px', display: 'flex', gap: '4px', padding: '4px 8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10
          }}>
            <div style={{cursor: 'grab'}}><Icon source={DragHandleIcon} tone="textInverse" /></div>
            <div style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); duplicateField(f); }}><Icon source={DuplicateIcon} tone="textInverse" /></div>
            <div style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}><Icon source={DeleteIcon} tone="textInverse" /></div>
            {f.type !== 'hidden' && <div style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); setRightTab('style'); }}><Icon source={HashtagIcon} tone="textInverse" /></div>}
          </div>
        )}

        {f.type === 'container' ? (
          <>
            {f.children?.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', width: '100%', color: '#a0aec0' }}>Drop widgets into this container</div>
            ) : (
              f.children?.map((child: any) => renderField(child))
            )}
          </>
        ) : f.type === 'heading' ? (
          <h2 style={{ margin: fStyles.margin || 0, color: fStyles.color || 'inherit', fontSize: fStyles.fontSize || f.fontSize || '24px', textAlign: fStyles.textAlign || 'left' }}>{f.label || 'Heading'}</h2>
        ) : f.type === 'paragraph' ? (
          <p style={{ margin: fStyles.margin || 0, color: fStyles.color || 'inherit', fontSize: fStyles.fontSize || '16px', textAlign: fStyles.textAlign || 'left', whiteSpace: 'pre-wrap' }}>{f.placeholder || 'Paragraph text here...'}</p>
        ) : f.type === 'image' ? (
          <div style={{ width: f.imageWidth || '100%', margin: fStyles.margin || '0 auto', textAlign: f.imageAlign || 'center', borderRadius: fStyles.radius || '8px', overflow: 'hidden' }}>
            {f.imageUrl ? <img src={f.imageUrl} alt={f.label} style={{ maxWidth: '100%', height: 'auto', borderRadius: fStyles.radius || '8px' }} /> : <div style={{ background: '#e2e8f0', width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', borderRadius: fStyles.radius || '8px' }}><Icon source={ViewIcon} tone="subdued" /> <span style={{ marginLeft: '8px' }}>Image Placeholder</span></div>}
          </div>
        ) : f.type === 'divider' ? (
          <div style={{ width: f.dividerWidth || '100%', margin: fStyles.margin || '20px 0', borderTop: `${f.dividerThickness || '1px'} ${f.dividerStyle || 'solid'} ${f.dividerColor || '#e2e8f0'}` }}></div>
        ) : f.type === 'spacer' ? (
          <div style={{ width: '100%', height: f.spacerHeight || '30px', backgroundColor: isSelected ? 'rgba(0, 91, 211, 0.05)' : 'transparent', border: isSelected ? '1px dashed #005bd3' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {isSelected && <span style={{ fontSize: '11px', color: '#005bd3' }}>Spacer ({f.spacerHeight || '30px'})</span>}
          </div>
        ) : f.type === 'html' ? (
          <div style={{ padding: '16px', background: '#e2e8f0', borderRadius: '8px' }}>{f.htmlCode ? 'Custom HTML Block (Configured)' : '<Custom HTML>'}</div>
        ) : f.type === 'shortcode' ? (
          <div style={{ padding: '16px', background: '#e2e8f0', borderRadius: '8px' }}>{f.shortcode ? `[${f.shortcode}]` : '[shortcode]'}</div>
        ) : f.type === 'hidden' ? (
          <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: '6px', color: '#d97706', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon source={ViewIcon} tone="warning" /> 
            <div>
               <strong>Hidden Field:</strong> {f.hiddenKey || 'key'} = {f.hiddenValue || 'value'}
            </div>
          </div>
        ) : f.type === 'submit' ? (
          <div style={{ 
            padding: basePadding, 
            border: `1px solid ${fStyles.borderColor || '#000000'}`, 
            borderRadius: resolvedGlobalStyles.input_radius || '8px', 
            backgroundColor: fStyles.bg || '#000000', 
            color: fStyles.color || '#ffffff',
            textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', width: '100%'
          }}>{f.label}</div>
        ) : (
          <div style={{ position: 'relative' }}>
            {!isFloating && (
              <Text as="label" fontWeight="medium" style={{ display: 'block', marginBottom: '8px', color: fStyles.color || 'inherit' }}>
                {f.label} {f.required && <span style={{color:'var(--p-color-text-critical)'}}>*</span>}
              </Text>
            )}
            
            <div className="nf-input-wrapper" style={{ 
              padding: f.type === 'checkbox' || f.type === 'radio' ? '0' : basePadding, 
              border: f.type === 'checkbox' || f.type === 'radio' ? 'none' : `${borderWidth} ${borderStyle} ${fStyles.borderColor || resolvedGlobalStyles.input_border || '#cbd5e0'}`, 
              borderRadius: resolvedGlobalStyles.input_radius || '8px', 
              backgroundColor: f.type === 'checkbox' || f.type === 'radio' ? 'transparent' : (fStyles.bg || resolvedGlobalStyles.input_bg || '#ffffff'), 
              color: 'var(--p-color-text-subdued)',
              boxShadow: fStyles.boxShadow || resolvedGlobalStyles.input_shadow || 'none',
              boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              position: 'relative'
            }}>
              {/* Floating Label Span */}
              {isFloating && f.type !== 'checkbox' && f.type !== 'radio' && (
                <span className="nf-floating-label" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '-10px',
                  backgroundColor: fStyles.bg || resolvedGlobalStyles.input_bg || '#ffffff',
                  padding: '0 4px',
                  fontSize: '12px',
                  color: fStyles.color || '#a0aec0',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  {f.label} {f.required && <span style={{color:'var(--p-color-text-critical)'}}>*</span>}
                </span>
              )}

              {/* Field UI */}
              {f.type === 'submit' && (
                <div style={{ width: '100%', display: 'flex', justifyContent: resolvedGlobalStyles.textAlign || 'left' }}>
                  <button style={{
                    padding: '12px 24px',
                    backgroundColor: resolvedGlobalStyles.primary_color || '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: resolvedGlobalStyles.input_radius || '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '300px'
                  }}>
                    {f.label || 'Submit'}
                  </button>
                </div>
              )}
              {f.type === 'toggle' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '13px', color: 'var(--p-color-text)' }}>{f.offValue || 'No'}</span>
                  <div style={{ width: '40px', height: '22px', backgroundColor: f.defaultState ? (fStyles.checkedBg || '#005bd3') : '#cbd5e0', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                    <div style={{ position: 'absolute', top: '2px', left: f.defaultState ? '20px' : '2px', width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--p-color-text)' }}>{f.onValue || 'Yes'}</span>
                </div>
              )}
              {f.type === 'buttonselect' && (
                <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => (
                    <div key={i} style={{ padding: '8px 16px', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', backgroundColor: i === 0 ? (fStyles.checkedBg || 'rgba(0, 91, 211, 0.1)') : 'transparent', color: i === 0 ? (fStyles.checkedBg || '#005bd3') : 'var(--p-color-text-subdued)', borderColor: i === 0 ? (fStyles.checkedBg || '#005bd3') : (resolvedGlobalStyles.input_border || '#cbd5e0'), fontSize: '13px', textAlign: 'center', flex: f.fullWidth ? 1 : 'none', cursor: 'pointer' }}>
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'imagechoice' && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${f.gridColumns || 3}, 1fr)`, gap: '12px', width: '100%' }}>
                  {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => (
                    <div key={i} style={{ border: `2px solid ${i === 0 ? (fStyles.checkedBg || '#005bd3') : 'transparent'}`, borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ width: '100%', height: f.imageSize || '100px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: opt.imageUrl ? `url(${opt.imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                         {!opt.imageUrl && <Icon source={ViewIcon} tone="subdued" />}
                      </div>
                      <div style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: 'var(--p-color-text)', fontWeight: i === 0 ? 'bold' : 'normal' }}>{opt.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'colorswatch' && (
                <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                  {(f.options || [{label:'Red'},{label:'Blue'}]).map((opt: any, i: number) => (
                    <div key={i} style={{ width: f.swatchSize || '32px', height: f.swatchSize || '32px', borderRadius: f.swatchShape === 'square' ? '4px' : '50%', backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][i % 4], border: i === 0 ? `2px solid ${fStyles.checkedBg || '#000'}` : '1px solid #e2e8f0', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {f.showLabel !== false && <div style={{ position: 'absolute', bottom: '-20px', fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>{opt.label}</div>}
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'checkbox' && (
                <div style={{ display: 'flex', flexDirection: f.layoutDirection || 'column', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => {
                    const cSize = parseInt(fStyles.checkboxSize || '16');
                    const cShape = fStyles.checkboxShape === 'rounded' ? '4px' : (fStyles.checkboxShape === 'circle' ? '50%' : '0px');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: f.layoutDirection === 'row' ? '16px' : '0' }}>
                        <div style={{ width: `${cSize}px`, height: `${cSize}px`, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: cShape, backgroundColor: fStyles.checkedBg || resolvedGlobalStyles.input_bg || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon source={CheckIcon} tone="subdued" />
                        </div>
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {f.type === 'radio' && (
                <div style={{ display: 'flex', flexDirection: f.layoutDirection || 'column', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => {
                    const rSize = parseInt(fStyles.radioSize || '16');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: f.layoutDirection === 'row' ? '16px' : '0' }}>
                        <div style={{ width: `${rSize}px`, height: `${rSize}px`, border: `1px solid ${fStyles.radioRingColor || resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '50%', backgroundColor: resolvedGlobalStyles.input_bg || '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: `${rSize * 0.5}px`, height: `${rSize * 0.5}px`, borderRadius: '50%', backgroundColor: fStyles.radioDotColor || '#000000', opacity: 0.2 }}></div>
                        </div>
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {(f.type === 'toggle' || f.type === 'switch') && (
                <div style={{ display: 'flex', flexDirection: f.layoutDirection || 'column', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                  {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: f.layoutDirection === 'row' ? '16px' : '0' }}>
                        <div style={{ width: '40px', height: '20px', borderRadius: '20px', backgroundColor: i === 0 ? (fStyles.trackOnColor || '#005bd3') : (fStyles.trackOffColor || '#e2e8f0'), position: 'relative', display: 'flex', alignItems: 'center', padding: '2px', boxSizing: 'border-box' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: fStyles.thumbColor || '#ffffff', transform: i === 0 ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}></div>
                        </div>
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {(f.type === 'select' || f.type === 'multiselect') && (
                <div style={{ width: '100%', position: 'relative' }} className={`nf-custom-select-wrapper`}>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {f.type === 'multiselect' ? (
                        <>
                          <div style={{ padding: '2px 8px', backgroundColor: 'rgba(0, 91, 211, 0.1)', borderRadius: '12px', fontSize: '11px', color: '#005bd3' }}>{(f.options && f.options[0]?.label) || 'Option 1'}</div>
                          <div style={{ padding: '2px 8px', backgroundColor: 'rgba(0, 91, 211, 0.1)', borderRadius: '12px', fontSize: '11px', color: '#005bd3' }}>+1</div>
                        </>
                      ) : (
                        <span style={{ color: fStyles.color || 'inherit' }}>{f.placeholder || (f.options && f.options[0]?.label) || 'Select an option...'}</span>
                      )}
                    </div>
                    <div className="nf-chevron" style={{ transform: f.iconRotate ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex', alignItems: 'center' }}>
                      {f.dropdownIconUrl ? <img src={f.dropdownIconUrl} style={{ width: '20px', height: '20px' }} alt="" /> : <span style={{ fontSize: '10px' }}>▼</span>}
                    </div>
                  </div>
                  <div className="nf-dropdown-menu" style={{
                    position: 'absolute', top: '100%', left: 0, width: '100%',
                    backgroundColor: fStyles.bg || resolvedGlobalStyles.input_bg || '#ffffff',
                    border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`,
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    marginTop: '4px', zIndex: 10,
                    display: 'none', flexDirection: 'column'
                  }}>
                    {(f.options || [{label:'Option 1'}]).map((opt: any, i: number) => (
                      <div key={i} className="nf-dropdown-item" style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background-color 0.2s', fontSize: '13px', color: 'var(--p-color-text)' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(f.type === 'date' || f.type === 'time') && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{f.placeholder || (f.type === 'date' ? 'MM/DD/YYYY' : 'HH:MM AM/PM')}</span>
                  <div style={{ color: fStyles.iconColor || 'inherit', fontSize: fStyles.iconSize || '20px', display: 'flex', alignItems: 'center' }}>
                    <Icon source={CalendarIcon} tone="subdued" />
                  </div>
                </div>
              )}
              {f.type === 'address' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {f.showStreet !== false && <div style={{ border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, padding: '8px', borderRadius: '4px', color: '#a0aec0' }}>Street Address</div>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {f.showCity !== false && <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, padding: '8px', borderRadius: '4px', color: '#a0aec0' }}>City</div>}
                    {f.showState !== false && <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, padding: '8px', borderRadius: '4px', color: '#a0aec0' }}>State / Province</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {f.showZip !== false && <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, padding: '8px', borderRadius: '4px', color: '#a0aec0' }}>ZIP / Postal Code</div>}
                    {f.showCountry !== false && <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, padding: '8px', borderRadius: '4px', color: '#a0aec0' }}>Country</div>}
                  </div>
                </div>
              )}
              {f.type === 'calculated' && (
                <div style={{ width: '100%', padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--p-color-text-subdued)' }}>Auto-calculated</span>
                  <span style={{ fontWeight: 'bold' }}>{f.prefixText || ''} 0.00 {f.suffixText || ''}</span>
                </div>
              )}
              {f.type === 'quantity' && (
                <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', overflow: 'hidden', width: 'fit-content' }}>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderRight: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, cursor: 'pointer', color: '#4a5568' }}>-</div>
                  <div style={{ padding: '8px 24px', textAlign: 'center', minWidth: '40px' }}>{f.defaultValue || '1'}</div>
                  <div style={{ padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, cursor: 'pointer', color: '#4a5568' }}>+</div>
                </div>
              )}
              {f.type === 'slider' && (
                <div style={{ width: '100%', padding: '12px 0' }}>
                  <div style={{ position: 'relative', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px' }}>
                     <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '50%', backgroundColor: resolvedGlobalStyles.primary_color || '#000000', borderRadius: '3px' }}></div>
                     <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', backgroundColor: '#fff', border: `2px solid ${resolvedGlobalStyles.primary_color || '#000000'}`, borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', cursor: 'pointer' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--p-color-text-subdued)' }}>
                    <span>{f.minVal || '0'}</span>
                    <span>{f.maxVal || '100'}</span>
                  </div>
                </div>
              )}
              {f.type === 'lookup' && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: fStyles.color || 'inherit' }}>{f.placeholder || 'Type to search...'}</span>
                  <Icon source={SearchIcon} tone="subdued" />
                </div>
              )}
              {f.type === 'captcha' && (
                <div style={{ width: 'fit-content', padding: '12px', backgroundColor: '#fafafa', border: '1px solid #d3d3d3', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0px 0px 4px 1px rgba(0,0,0,0.08)' }}>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#fff', border: '2px solid #c1c1c1', borderRadius: '2px' }}></div>
                  <div style={{ fontSize: '14px', color: '#555' }}>I'm not a robot</div>
                  <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.7 }}>
                     <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" style={{ width: '24px' }} alt="reCAPTCHA" />
                     <span style={{ fontSize: '8px', color: '#555', marginTop: '4px' }}>reCAPTCHA</span>
                  </div>
                </div>
              )}
              {f.type === 'product' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', width: '100%' }}>
                  {[1, 2].map((i) => (
                    <div key={i} style={{ border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '6px', overflow: 'hidden', backgroundColor: fStyles.productCardBg || '#fff' }}>
                      <div style={{ width: '100%', height: '100px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon source={CartIcon} tone="subdued" />
                      </div>
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: fStyles.productTitleColor || 'var(--p-color-text)' }}>Sample Product {i}</div>
                        {f.showPrice !== false && <div style={{ fontSize: '12px', color: fStyles.productPriceColor || 'var(--p-color-text-subdued)' }}>$29.99</div>}
                        {f.allowQuantity && <div style={{ marginTop: '8px', border: `1px solid ${fStyles.productQtyBorder || '#e2e8f0'}`, borderRadius: '4px', textAlign: 'center', fontSize: '12px', padding: '4px' }}>Qty: 1</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'variant' && (
                <div style={{ width: '100%', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: fStyles.pickerBg || 'transparent' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: fStyles.pickerTextColor || 'var(--p-color-text)' }}>Select Variant...</div>
                  </div>
                  <div style={{ color: fStyles.pickerIconColor || 'inherit' }}><span style={{ fontSize: '10px' }}>▼</span></div>
                </div>
              )}
              {f.type === 'collection' && (
                <div style={{ width: '100%', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: fStyles.pickerBg || 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: fStyles.pickerIconColor || 'inherit' }}><Icon source={ViewIcon} tone="subdued" /></div>
                    <span style={{ fontSize: '13px', color: fStyles.pickerTextColor || 'var(--p-color-text)' }}>Browse Collections...</span>
                  </div>
                  <div style={{ color: fStyles.pickerIconColor || 'inherit' }}><span style={{ fontSize: '10px' }}>▼</span></div>
                </div>
              )}
              {f.type === 'discount' && (
                <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                  <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', padding: '8px 12px', backgroundColor: fStyles.discountInputBg || 'transparent' }}>
                    <span style={{ color: 'var(--p-color-text-subdued)' }}>{f.placeholder || 'Promo Code'}</span>
                  </div>
                  <div style={{ backgroundColor: fStyles.discountBtnBg || resolvedGlobalStyles.primary_color || '#000000', color: fStyles.discountBtnText || '#ffffff', padding: '8px 16px', borderRadius: '4px', fontWeight: 500, cursor: 'pointer' }}>Apply</div>
                </div>
              )}
              {f.type === 'price' && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', border: `1px solid ${fStyles.priceBorderColor || resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', overflow: 'hidden' }}>
                  {f.currencyPosition !== 'after' && <div style={{ padding: '8px 12px', backgroundColor: fStyles.pricePrefixBg || '#f9fafb', color: '#718096', borderRight: `1px solid ${fStyles.priceBorderColor || resolvedGlobalStyles.input_border || '#cbd5e0'}` }}>{f.currencySymbol || '$'}</div>}
                  <div style={{ flex: 1, padding: '8px 12px', color: fStyles.priceTextColor || 'var(--p-color-text-subdued)' }}>0.00</div>
                  {f.currencyPosition === 'after' && <div style={{ padding: '8px 12px', backgroundColor: fStyles.pricePrefixBg || '#f9fafb', color: '#718096', borderLeft: `1px solid ${fStyles.priceBorderColor || resolvedGlobalStyles.input_border || '#cbd5e0'}` }}>{f.currencySymbol || '$'}</div>}
                </div>
              )}
              {f.type === 'customer' && (
                <div style={{ width: '100%', padding: '12px', border: '1px dashed #cbd5e0', borderRadius: '4px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>👤</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--p-color-text)' }}>Customer Account Linker</div>
                    <div style={{ fontSize: '11px', color: 'var(--p-color-text-subdued)' }}>Hidden on frontend if logged in</div>
                  </div>
                </div>
              )}
              {f.type === 'order' && (
                <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                  <div style={{ flex: 1, border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', padding: '8px 12px' }}>
                    <span style={{ color: 'var(--p-color-text-subdued)' }}>{f.placeholder || '#1001'}</span>
                  </div>
                  <div style={{ backgroundColor: '#f1f5f9', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, color: '#475569', padding: '8px 16px', borderRadius: '4px', fontWeight: 500, cursor: 'pointer' }}>Lookup Order</div>
                </div>
              )}
              {f.type === 'metafield' && (
                <div style={{ width: '100%', padding: '12px', border: '1px solid #fed7d7', borderRadius: '4px', backgroundColor: '#fff5f5', display: 'flex', alignItems: 'center', gap: '8px', color: '#c53030' }}>
                  <Icon source={HashtagIcon} tone="critical" />
                  <div style={{ fontSize: '12px' }}><strong>Metafield Mapping:</strong> {f.metafieldNamespace || 'custom'}.{f.metafieldKey || 'key'}</div>
                </div>
              )}
              {f.type === 'rating' && (
                <div style={{ display: 'flex', gap: '8px', fontSize: fStyles.ratingSize || '24px', color: fStyles.ratingActiveColor || f.ratingColor || '#fbbf24' }}>
                  {Array.from({ length: f.maxStars || 5 }).map((_, i) => (
                    <span key={i} style={{ cursor: 'pointer', transition: 'transform 0.1s' }}>{f.ratingIcon === 'heart' ? '♥' : f.ratingIcon === 'thumb' ? '👍' : '★'}</span>
                  ))}
                </div>
              )}
              {f.type === 'nps' && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', width: '100%', gap: '2px', height: '40px' }}>
                    {Array.from({ length: f.npsScale === '1-10' ? 10 : 11 }).map((_, i) => {
                      const num = f.npsScale === '1-10' ? i + 1 : i;
                      const hue = (i / (f.npsScale === '1-10' ? 9 : 10)) * 120; // Red to Green
                      return (
                        <div key={i} style={{ flex: 1, backgroundColor: `hsl(${hue}, 80%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: 0.9, transition: 'opacity 0.2s', borderRadius: i === 0 ? '4px 0 0 4px' : (i === (f.npsScale === '1-10' ? 9 : 10) ? '0 4px 4px 0' : '0') }}>
                          {num}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--p-color-text-subdued)' }}>
                    <span>{f.npsLeftLabel || 'Not at all likely'}</span>
                    <span>{f.npsRightLabel || 'Extremely likely'}</span>
                  </div>
                </div>
              )}
              {f.type === 'scale' && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', textAlign: 'right', flex: 1 }}>{f.scaleLeftLabel || 'Strongly Disagree'}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {Array.from({ length: f.scaleRange || 5 }).map((_, i) => (
                        <div key={i} style={{ width: fStyles.thumbSize || '32px', height: fStyles.thumbSize || '32px', borderRadius: '50%', border: `1px solid ${fStyles.trackUnfilledColor || '#cbd5e0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', cursor: 'pointer', backgroundColor: i === 0 ? (fStyles.thumbColor || '#fff') : '#fff', color: fStyles.numberLabelColor || '#4a5568' }}>
                          {f.showScaleNumbers !== false ? i + 1 : ''}
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--p-color-text-subdued)', flex: 1 }}>{f.scaleRightLabel || 'Strongly Agree'}</span>
                  </div>
                </div>
              )}
              {f.type === 'matrix' && (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}></th>
                        {(f.matrixCols || ['Poor', 'Fair', 'Good', 'Excellent']).map((col: string, i: number) => (
                          <th key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: 'var(--p-color-text-subdued)', fontWeight: 500 }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(f.matrixRows || ['Product Quality', 'Customer Service', 'Delivery Speed']).map((row: string, i: number) => (
                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ padding: '12px 8px', color: 'var(--p-color-text)' }}>{row}</td>
                          {(f.matrixCols || ['Poor', 'Fair', 'Good', 'Excellent']).map((_, j: number) => (
                            <td key={j} style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <input type={f.matrixSelection === 'checkbox' ? 'checkbox' : 'radio'} disabled style={{ cursor: 'pointer' }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {f.type === 'ranking' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(f.rankingItems || ['Option A', 'Option B', 'Option C']).map((item: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', border: `1px solid ${resolvedGlobalStyles.input_border || '#cbd5e0'}`, borderRadius: '4px', backgroundColor: '#fff', cursor: 'grab', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ color: '#a0aec0', cursor: 'grab' }}>≡</div>
                      {f.showRankNumbers !== false && <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: resolvedGlobalStyles.primary_color || '#000000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>{i + 1}</div>}
                      <div style={{ flex: 1, fontSize: '14px' }}>{item}</div>
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'sentiment' && (
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%' }}>
                  {(f.sentimentEmojis || ['😡', '😞', '😐', '😊', '😍']).map((emoji: string, i: number) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s, transform 0.2s' }}>
                      <div style={{ fontSize: '32px' }}>{emoji}</div>
                    </div>
                  ))}
                </div>
              )}
              {f.type === 'payment' && (
                <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Payment Details</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{f.currencySymbol || '$'}{f.paymentAmount || '0.00'}</div>
                  </div>
                  <div style={{ border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: '#fff', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#a0aec0', fontSize: '14px' }}>Card number</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <div style={{ width: '24px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '2px' }}></div>
                        <div style={{ width: '24px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '2px' }}></div>
                        <div style={{ width: '24px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <span style={{ color: '#a0aec0', fontSize: '14px', flex: 1 }}>MM / YY</span>
                      <span style={{ color: '#a0aec0', fontSize: '14px', flex: 1 }}>CVC</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '4px', fontSize: '11px', color: '#64748b', alignItems: 'center' }}>
                    <Icon source={LockIcon} tone="subdued" />
                    Powered by Stripe
                  </div>
                </div>
              )}
              {f.type === 'terms' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', width: '100%' }}>
                  <input type="checkbox" disabled style={{ marginTop: '3px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--p-color-text)' }}>
                    I agree to the <a href="#" style={{ color: resolvedGlobalStyles.primary_color || '#005bd3', textDecoration: 'underline' }}>{f.termsLinkText || 'Terms and Conditions'}</a>
                  </div>
                </div>
              )}
              {f.type === 'age' && (
                <div style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', backgroundColor: '#fff', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔞</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--p-color-text)', marginBottom: '16px' }}>Age Verification Required</div>
                  <div style={{ fontSize: '13px', color: 'var(--p-color-text-subdued)', marginBottom: '12px' }}>You must be at least {f.minAge || 18} years old to continue.</div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#a0aec0' }}>MM</div>
                    <div style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#a0aec0' }}>DD</div>
                    <div style={{ padding: '8px 12px', border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#a0aec0' }}>YYYY</div>
                  </div>
                </div>
              )}
              {f.type === 'gdpr' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Data & Marketing Preferences</div>
                  {f.gdprEmail !== false && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><input type="checkbox" disabled /><div style={{ fontSize: '13px' }}>I agree to receive email marketing.</div></div>}
                  {f.gdprSms && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><input type="checkbox" disabled /><div style={{ fontSize: '13px' }}>I agree to receive SMS marketing.</div></div>}
                  {f.gdprCookies !== false && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><input type="checkbox" disabled /><div style={{ fontSize: '13px' }}>I agree to the use of cookies and analytics.</div></div>}
                </div>
              )}
              {f.type === 'agreement' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '12px', backgroundColor: '#f8fafc', fontSize: '12px', color: 'var(--p-color-text-subdued)', maxHeight: '120px', overflowY: 'auto' }}>
                    {f.agreementText || 'By signing below, you agree to the terms and conditions outlined in this document...'}
                  </div>
                  <div style={{ border: '1px dashed #cbd5e0', borderRadius: '4px', height: '100px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', position: 'relative' }}>
                    <span style={{ position: 'absolute', bottom: '8px', left: '12px', fontSize: '12px' }}>X_______________________</span>
                    Sign Here
                  </div>
                </div>
              )}
              {f.type === 'file' && (
                <div style={{ width: '100%', textAlign: 'center', padding: '24px 0', border: `2px ${fStyles.uploadBorderStyle || 'dashed'} ${fStyles.uploadBorderColor || 'var(--p-color-border-subdued)'}`, borderRadius: '8px', backgroundColor: fStyles.uploadBg || '#fafbfb' }}>
                  <div style={{ color: fStyles.uploadIconColor || 'inherit' }}><Icon source={UploadIcon} tone="subdued" /></div>
                  <div style={{ marginTop: '8px', fontWeight: 500 }}>{f.placeholder || 'Upload a file'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--p-color-text-subdued)', marginTop: '4px' }}>Max {f.maxFileSize || 10}MB</div>
                </div>
              )}
              {f.type === 'videoupload' && (
                <div style={{ width: '100%', textAlign: 'center', padding: '24px 0', border: `2px ${fStyles.uploadBorderStyle || 'dashed'} ${fStyles.uploadBorderColor || 'var(--p-color-border-subdued)'}`, borderRadius: '8px', backgroundColor: fStyles.uploadBg || '#fafbfb' }}>
                  <div style={{ color: fStyles.uploadIconColor || 'inherit' }}><Icon source={UploadIcon} tone="subdued" /></div>
                  <div style={{ marginTop: '8px', fontWeight: 500 }}>{f.placeholder || 'Upload a video'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--p-color-text-subdued)', marginTop: '4px' }}>MP4, MOV up to {f.maxFileSize || 100}MB</div>
                </div>
              )}
              {f.type === 'imageupload' && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '100%', textAlign: 'center', padding: '24px 0', border: `2px ${fStyles.uploadBorderStyle || 'dashed'} ${fStyles.uploadBorderColor || 'var(--p-color-border-subdued)'}`, borderRadius: '8px', backgroundColor: fStyles.uploadBg || '#fafbfb', cursor: 'pointer' }}>
                    <div style={{ color: fStyles.uploadIconColor || 'inherit' }}><Icon source={ViewIcon} tone="subdued" /></div>
                    <div style={{ marginTop: '8px', fontWeight: 500 }}>{f.placeholder || 'Click to upload image'}</div>
                  </div>
                  {f.previewUpload && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ width: '60px', height: '60px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
                      <div style={{ width: '60px', height: '60px', border: '1px dashed #cbd5e0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0', fontSize: '24px' }}>+</div>
                    </div>
                  )}
                </div>
              )}
              {f.type === 'camera' && (
                <div style={{ width: '100%', textAlign: 'center', padding: '16px 0', border: `1px ${fStyles.uploadBorderStyle || 'solid'} ${fStyles.uploadBorderColor || 'var(--p-color-border)'}`, borderRadius: '8px', backgroundColor: fStyles.uploadBg || 'var(--p-color-bg-surface-secondary)' }}>
                  <div style={{ color: fStyles.uploadIconColor || 'inherit' }}><Icon source={ViewIcon} tone="base" /></div>
                  <div style={{ marginTop: '4px', fontWeight: 500 }}>{f.placeholder || 'Open Camera'}</div>
                </div>
              )}
              {f.type === 'signature' && (
                <div style={{ width: '100%', border: f.showBorder !== false ? `1px solid ${fStyles.borderColor || '#cbd5e0'}` : 'none', borderRadius: '4px', backgroundColor: fStyles.canvasBg || f.canvasBg || '#ffffff', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: f.canvasHeight || '150px', position: 'relative' }}>
                     <div style={{ position: 'absolute', bottom: '20px', left: '10%', right: '10%', borderBottom: '1px dashed #e2e8f0' }}></div>
                     <div style={{ position: 'absolute', bottom: '24px', left: '10%', right: '10%', textAlign: 'center', fontSize: '10px', color: '#a0aec0', opacity: 0.5 }}>Sign Here ({fStyles.penColor || f.penColor || 'black'} ink)</div>
                  </div>
                  {f.showClearButton && (
                    <div style={{ width: '100%', padding: '4px 8px', textAlign: 'right', backgroundColor: '#f9fafb', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: fStyles.clearBtnColor || 'var(--p-color-text-subdued)' }}>
                      Clear
                    </div>
                  )}
                </div>
              )}
              {(f.type === 'text' || f.type === 'email' || f.type === 'phone' || f.type === 'url' || f.type === 'color') && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  {f.type === 'phone' && f.flagStyle !== 'hidden' && (
                    <div style={{ 
                      marginRight: '8px', 
                      width: f.flagStyle === 'round' ? '20px' : '24px', 
                      height: f.flagStyle === 'round' ? '20px' : '16px', 
                      borderRadius: f.flagStyle === 'round' ? '50%' : '2px',
                      backgroundColor: '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px'
                    }}>🇺🇸</div>
                  )}
                  {f.type === 'phone' && (
                    <div style={{ marginRight: '8px', color: fStyles.countryCodeColor || 'inherit', fontWeight: fStyles.countryCodeWeight || 'inherit', fontSize: '14px' }}>+1</div>
                  )}
                  <div style={{ flex: 1 }}>{isFloating ? (f.placeholder || 'Type here...') : (f.placeholder || f.label)}</div>
                </div>
              )}
              {f.type === 'number' && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {f.prefixText && <span style={{ marginRight: '8px', color: fStyles.prefixColor || 'var(--p-color-text-subdued)' }}>{f.prefixText}</span>}
                  <div style={{ flex: 1 }}>{isFloating ? (f.placeholder || '0') : (f.placeholder || f.label)}</div>
                  {f.suffixText && <span style={{ marginLeft: '8px', color: fStyles.prefixColor || 'var(--p-color-text-subdued)' }}>{f.suffixText}</span>}
                  {f.showSpinners !== false && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '8px', opacity: 0.5 }}>
                       <span style={{ fontSize: '8px' }}>▲</span>
                       <span style={{ fontSize: '8px' }}>▼</span>
                    </div>
                  )}
                </div>
              )}
              {f.type === 'password' && (
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>{isFloating ? (f.placeholder || '••••••••') : (f.placeholder || f.label)}</div>
                    {f.showToggle && (
                      <div style={{ color: fStyles.toggleIconColor || 'inherit', fontSize: fStyles.toggleIconSize || '16px', display: 'flex', alignItems: 'center' }}>
                        <Icon source={ViewIcon} tone="subdued" />
                      </div>
                    )}
                  </div>
                  {f.showStrength && (
                    <div style={{ marginTop: '12px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: '33%', backgroundColor: fStyles.strengthWeakColor || '#ff5c5c' }}></div>
                      <div style={{ width: '33%', backgroundColor: '#e2e8f0' }}></div>
                      <div style={{ width: '34%', backgroundColor: '#e2e8f0' }}></div>
                    </div>
                  )}
                </div>
              )}
              {f.type === 'textarea' && (
                <div style={{ width: '100%' }}>
                  <div style={{ minHeight: `${(parseInt(f.rows) || 4) * 20}px` }}>{isFloating ? (f.placeholder || 'Type here...') : (f.placeholder || f.label)}</div>
                  {f.showCounter && (
                    <div style={{ textAlign: 'right', fontSize: fStyles.counterSize || '11px', color: fStyles.counterColor || 'var(--p-color-text-subdued)', marginTop: '4px' }}>0 / {f.maxLength || 500}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="builder-workspace-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', width: '100%', margin: 0, backgroundColor: '#f4f6f8', position: 'relative' }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(100px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-slider { -webkit-appearance: none; width: 100%; height: 4px; border-radius: 4px; outline: none; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #005bd3; box-shadow: 0 0 0 2px #fff; cursor: pointer; transition: transform 0.1s; }
        .custom-slider::-webkit-slider-thumb:active { transform: scale(1.1); }
        .custom-input { border: 1px solid #cbd5e0; border-radius: 8px; padding: 6px 8px; font-size: 13px; outline: none; transition: box-shadow 0.2s, border-color 0.2s; box-sizing: border-box; }
        .custom-input:focus { box-shadow: 0 0 0 2px rgba(0, 91, 211, 0.3); border-color: #005bd3; }
        .custom-label { font-size: 13px; color: #202223; font-weight: 500; }
        .divider { height: 1px; background-color: #e2e8f0; margin: 24px 0; border: none; }
        .nf-custom-select-wrapper:hover .nf-dropdown-menu { display: flex !important; }
        .nf-custom-select-wrapper:hover .nf-chevron { transform: rotate(180deg) !important; }
        .nf-dropdown-item:hover { background-color: rgba(0, 0, 0, 0.05) !important; }
        .Polaris-Box:has(.builder-workspace-wrapper) { padding: 0 !important; }
      `}</style>
      
      {/* Top Custom Header */}
      <div className="builder-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', 
        borderBottom: '1px solid var(--p-color-border-subdued)', backgroundColor: 'var(--p-color-bg-surface)', 
        flexShrink: 0, height: '60px', marginTop: '17px'
      }}>
        <InlineStack gap="400" align="center" blockAlign="center">
          <Button variant="plain" icon={ArrowLeftIcon} onClick={() => {
            if (typeof shopify !== 'undefined' && shopify.modal) shopify.modal.hide('form-builder-iframe-modal');
            else nav('/app/forms');
          }} />
          <Text as="h1" variant="headingMd" fontWeight="medium">
            <span style={{ color: 'var(--p-color-text-subdued)' }}>Forms / </span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 'bold', fontSize: 'inherit', maxWidth: '300px' }} />
            {form.id && form.id !== 'new' && (
              <div style={{ marginLeft: '8px', display: 'inline-block' }}>
                <Tooltip content="Copy Form ID">
                  <Button variant="plain" icon={ClipboardIcon} onClick={() => {
                    navigator.clipboard.writeText(form.id);
                    if (typeof shopify !== 'undefined') shopify.toast.show('Form ID copied to clipboard');
                  }} accessibilityLabel="Copy Form ID" />
                </Tooltip>
              </div>
            )}
          </Text>
        </InlineStack>

        <InlineStack gap="400" align="center" blockAlign="center">
          <InlineStack gap="100" align="center" blockAlign="center">
            {hasUnsavedChanges ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--p-color-text-subdued)' }} /> : <Icon source={CheckIcon} tone="success" />}
            <Text as="span" tone={hasUnsavedChanges ? "subdued" : "success"}>{hasUnsavedChanges ? "Unsaved changes" : "Saved"}</Text>
          </InlineStack>
          <Divider orientation="vertical" />
          <div style={{ opacity: canUndo ? 1 : 0.5, pointerEvents: canUndo ? 'auto' : 'none', cursor: 'pointer' }} onClick={undo}><Icon source={UndoIcon} tone="base" /></div>
          <div style={{ opacity: canRedo ? 1 : 0.5, pointerEvents: canRedo ? 'auto' : 'none', cursor: 'pointer' }} onClick={redo}><Icon source={RedoIcon} tone="base" /></div>
          <Divider orientation="vertical" />
          <div style={{ opacity: viewMode === 'desktop' ? 1 : 0.4, cursor: 'pointer' }} onClick={() => setViewMode('desktop')}><Icon source={DesktopIcon} tone="base" /></div>
          <div style={{ opacity: viewMode === 'mobile' ? 1 : 0.4, cursor: 'pointer' }} onClick={() => setViewMode('mobile')}><Icon source={MobileIcon} tone="base" /></div>
          <Button variant="primary" onClick={handleSave} loading={isSaving}>Publish</Button>
        </InlineStack>
      </div>

      {/* Main Workspace */}
      <div className="builder-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Sidebar - Widgets */}
        <div className="builder-left-sidebar" style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--p-color-border-subdued)', backgroundColor: 'var(--p-color-bg-surface)', display: 'flex', flexDirection: 'column', marginLeft: '17px' }}>
          <div style={{ padding: '16px 16px 0' }}><Tabs tabs={[{id:'widgets', content:'Widgets'}, {id:'templates', content:'Templates'}]} selected={leftTab} onSelect={setLeftTab} /></div>
          <Scrollable style={{ flex: 1, padding: '16px' }}>
            {leftTab === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <TextField labelHidden label="Search" prefix={<Icon source={SearchIcon} />} placeholder="Search widgets" autoComplete="off" value={searchQuery} onChange={setSearchQuery} clearButton onClearButtonClick={() => setSearchQuery("")} />
                {filteredWidgets.length === 0 && <Text as="p" tone="subdued">No widgets found.</Text>}
                {filteredWidgets.map(cat => {
                  const isPremium = ['Media', 'Advanced', 'Commerce', 'Survey & Feedback', 'Payment & Legal'].includes(cat.category);
                  return (
                  <div key={cat.category} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>{cat.category}</span>
                      {isPremium && <Badge tone="info" size="small">Starter+</Badge>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {cat.items.map(w => (
                        <div 
                          key={w.type} 
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('widgetType', w.type);
                            e.dataTransfer.setData('widgetLabel', w.label);
                          }}
                          onClick={() => {
                            addWidget(w.type, w.label);
                          }} 
                          style={{ 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 4px', 
                            border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', 
                            backgroundColor: '#ffffff', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box',
                            position: 'relative'
                          }} 
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#005bd3'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 91, 211, 0.1)'; }} 
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ display: 'flex' }}><Icon source={w.icon} tone="base" /></div>
                          <span style={{ fontSize: '11px', textAlign: 'center', color: '#4b5563', fontWeight: 500, lineHeight: 1.2 }}>{w.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )})}              </div>
            )}
          </Scrollable>
        </div>

        {/* Center Canvas */}
        <div className="builder-center-canvas" style={{ flex: 1, backgroundColor: '#f4f6f8', padding: '40px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }} onDragOver={(e) => handleDragOver(e, 'root')} onDrop={(e) => handleDrop(e, 'root')}>
          <div onClick={() => { setSelectedFieldId(null); setRightTab('style'); }} style={{ width: '100%', maxWidth: viewMode === 'mobile' ? '375px' : (resolvedGlobalStyles.maxWidth || '800px'), backgroundColor: resolvedGlobalStyles.bg || '#ffffff', borderRadius: resolvedGlobalStyles.radius || '16px', padding: resolvedGlobalStyles.padding || '32px', margin: resolvedGlobalStyles.margin || '0 auto', border: `1px solid ${resolvedGlobalStyles.borderColor || '#e2e8f0'}`, display: 'flex', flexWrap: 'wrap', gap: resolvedGlobalStyles.gap || '16px', boxShadow: resolvedGlobalStyles.boxShadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', height: 'fit-content', minHeight: '400px', alignContent: 'flex-start', boxSizing: 'border-box', transition: 'max-width 0.3s ease', fontFamily: resolvedGlobalStyles.fontFamily || 'inherit', textAlign: resolvedGlobalStyles.textAlign || 'left' }}>
            <div style={{ width: '100%', marginBottom: '16px' }}>
              <Text as="h2" variant="headingXl" fontWeight="bold">{title}</Text>
              <Text as="p" tone="subdued">We'll get back to you within a day.</Text>
            </div>
            {(() => {
              if (fields.length === 0) return <div style={{ width: '100%', textAlign: 'center', padding: '60px 0', color: 'var(--p-color-text-subdued)' }}>Drag or click widgets on the left to build your form.</div>;

              // Split fields into pages by pagebreak
              const pages: any[][] = [[]];
              const pageBreaks: any[] = [null]; // pageBreaks[i] = the pagebreak field that starts step i+1
              let pageIdx = 0;
              fields.forEach(f => {
                if (f.type === 'pagebreak') {
                  pageBreaks.push(f);
                  pageIdx++;
                  pages[pageIdx] = [];
                } else {
                  pages[pageIdx].push(f);
                }
              });

              const totalSteps = pages.length;
              const safeStep = Math.min(currentStep, totalSteps - 1);
              const currentPageFields = pages[safeStep] || [];

              // Step settings: read from next pagebreak (which defines the NEXT step)
              // The current step's label settings come from the pagebreak that ended step safeStep-1
              // i.e. pageBreaks[safeStep] defines the button labels for transitioning INTO this step
              const stepBreak = pageBreaks[safeStep]; // pagebreak before this step
              const fillColor = resolvedGlobalStyles.step_fillColor || resolvedGlobalStyles.primary_color || '#7c3aed';
              const trackColor = resolvedGlobalStyles.step_trackColor || '#e2e8f0';
              const progressStyle = stepBreak?.progressStyle || resolvedGlobalStyles.step_progressStyle || 'dots';
              const stepTitle = stepBreak?.stepTitle || '';
              const stepDesc = stepBreak?.stepDescription || '';
              const continueLabel = stepBreak?.continueLabel || resolvedGlobalStyles.step_continueLabel || 'Continue';
              const backLabel = stepBreak?.backLabel || resolvedGlobalStyles.step_backLabel || 'Back';
              const isLastStep = safeStep === totalSteps - 1;

              // Progress indicator renderer
              const renderProgress = () => {
                if (totalSteps <= 1 || progressStyle === 'none') return null;
                if (progressStyle === 'bar') {
                  const pct = totalSteps > 1 ? ((safeStep) / (totalSteps - 1)) * 100 : 100;
                  return (
                    <div style={{ width: '100%', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                        <span>Step {safeStep + 1}</span><span>{totalSteps} steps</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: trackColor, borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: fillColor, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  );
                }
                if (progressStyle === 'numbered') {
                  return (
                    <div style={{ width: '100%', textAlign: 'center', marginBottom: '20px', fontWeight: 700, fontSize: resolvedGlobalStyles.step_counterSize || '20px', color: resolvedGlobalStyles.step_counterColor || fillColor, letterSpacing: '0.05em' }}>
                      {String(safeStep + 1).padStart(2, '0')} — {String(totalSteps).padStart(2, '0')}
                    </div>
                  );
                }
                // Default: 'dots' — numbered circles connected by a line (matches reference image)
                return (
                  <div style={{ width: '100%', marginBottom: '24px', position: 'relative' }}>
                    {/* connector line */}
                    <div style={{ position: 'absolute', top: '16px', left: `calc(${100 / totalSteps / 2}%)`, right: `calc(${100 / totalSteps / 2}%)`, height: '2px', backgroundColor: trackColor, zIndex: 0 }}>
                      <div style={{ height: '100%', backgroundColor: fillColor, width: `${safeStep === 0 ? 0 : (safeStep / (totalSteps - 1)) * 100}%`, transition: 'width 0.3s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                      {pages.map((_, i) => {
                        const done = i < safeStep;
                        const active = i === safeStep;
                        return (
                          <div key={i} onClick={(e) => { e.stopPropagation(); setCurrentStep(i); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: (done || active) ? fillColor : trackColor, color: (done || active) ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: active ? `3px solid ${fillColor}` : 'none', boxShadow: active ? `0 0 0 3px ${fillColor}33` : 'none', transition: 'all 0.2s' }}>
                              {done ? '✓' : i + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: resolvedGlobalStyles.gap || '16px', alignContent: 'flex-start' }}>
                  {/* Progress */}
                  {renderProgress()}

                  {/* Step title / description */}
                  {stepTitle && <div style={{ fontSize: '20px', fontWeight: 700, color: resolvedGlobalStyles.text_color || '#1e293b', marginBottom: stepDesc ? '4px' : '0' }}>{stepTitle}</div>}
                  {stepDesc && <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>{stepDesc}</div>}

                  {/* Fields for current step */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: resolvedGlobalStyles.gap || '16px', width: '100%' }}>
                    {currentPageFields.map(f => renderField(f))}
                  </div>

                  {/* Navigation */}
                  {totalSteps > 1 && (
                    <div style={{ width: '100%', display: 'flex', justifyContent: safeStep === 0 ? 'flex-end' : 'space-between', marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                      {safeStep > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setCurrentStep(safeStep - 1); }}
                          style={{ padding: '10px 20px', border: `1px solid ${trackColor}`, backgroundColor: '#fff', borderRadius: resolvedGlobalStyles.submit_radius || '6px', cursor: 'pointer', fontWeight: 500, color: '#374151', fontSize: '14px' }}
                        >{backLabel}</button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!isLastStep) setCurrentStep(safeStep + 1); }}
                        style={{ padding: '10px 24px', border: 'none', backgroundColor: fillColor, color: '#ffffff', borderRadius: resolvedGlobalStyles.submit_radius || '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', boxShadow: `0 4px 12px ${fillColor}44` }}
                      >{isLastStep ? 'Submit' : continueLabel}</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="builder-right-sidebar" style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid rgba(226, 232, 240, 0.5)', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 0' }}>
            {(() => {
              const allTabs = [{id:'general', content:'General'}, {id:'style', content:'Style'}, {id:'logic', content:'Logic'}, {id:'advanced', content:'Advanced'}];
              const visibleTabs = selectedField?.type === 'hidden' ? allTabs.filter(t => t.id !== 'style') : allTabs;
              const selectedIndex = Math.max(0, visibleTabs.findIndex(t => t.id === rightTab));
              return <Tabs tabs={visibleTabs} selected={selectedIndex} onSelect={(idx) => setRightTab(visibleTabs[idx].id)} />;
            })()}
          </div>
          
          <Scrollable style={{ flex: 1, padding: '16px' }}>
            {rightTab === 'general' && (
              selectedField?.type === 'pagebreak' ? (
                // ── Step Break Configuration ──────────────────────────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '10px 14px', backgroundColor: '#f0f4ff', borderRadius: '8px', border: '1px solid #c7d7fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⚡</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>Step Break</div>
                      <div style={{ fontSize: '12px', color: '#3b5fc0' }}>Fields above this are Step {fields.slice(0, fields.indexOf(selectedField)).filter(f => f.type === 'pagebreak').length + 1} · Fields below are Step {fields.slice(0, fields.indexOf(selectedField)).filter(f => f.type === 'pagebreak').length + 2}</div>
                    </div>
                  </div>
                  <TextField label="Step title" placeholder="e.g. Create your password" value={selectedField.stepTitle || ''} onChange={(v) => updateSelectedField('stepTitle', v)} autoComplete="off" helpText="Shown as a heading above this step's fields" />
                  <TextField label="Step description" placeholder="Optional help text under the title" value={selectedField.stepDescription || ''} onChange={(v) => updateSelectedField('stepDescription', v)} autoComplete="off" multiline={2} />
                  <div style={{ marginBottom: '4px' }}>
                    <Select
                      label="Progress indicator style"
                      options={[
                        { label: 'Dots (numbered circles)', value: 'dots' },
                        { label: 'Progress bar', value: 'bar' },
                        { label: 'Numbered counter (01 — 04)', value: 'numbered' },
                        { label: 'None', value: 'none' },
                      ]}
                      value={selectedField.progressStyle || 'dots'}
                      onChange={(v) => updateSelectedField('progressStyle', v)}
                    />
                  </div>
                  <TextField label="Continue button label" placeholder="Continue" value={selectedField.continueLabel || ''} onChange={(v) => updateSelectedField('continueLabel', v)} autoComplete="off" helpText="Overrides the global default for this step only" />
                  <TextField label="Back button label" placeholder="Back" value={selectedField.backLabel || ''} onChange={(v) => updateSelectedField('backLabel', v)} autoComplete="off" />
                  <div style={{ padding: '12px', backgroundColor: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Skip Condition (optional)</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Skip this step entirely if a prior field matches a rule.</div>
                    <Select
                      label="If field"
                      labelHidden
                      options={[{label: 'No skip condition', value: ''}, ...fields.filter(f => f.id !== selectedField.id && f.type !== 'pagebreak').map(f => ({ label: f.label || f.type, value: f.id }))]}
                      value={selectedField.skipIfField || ''}
                      onChange={(v) => updateSelectedField('skipIfField', v)}
                    />
                    {selectedField.skipIfField && (
                      <>
                        <div style={{ marginTop: '8px' }}>
                          <Select
                            label="Operator"
                            labelHidden
                            options={[{label:'equals',value:'=='},{label:'does not equal',value:'!='},{label:'contains',value:'contains'},{label:'is empty',value:'empty'}]}
                            value={selectedField.skipOperator || '=='}
                            onChange={(v) => updateSelectedField('skipOperator', v)}
                          />
                        </div>
                        {selectedField.skipOperator !== 'empty' && (
                          <div style={{ marginTop: '8px' }}>
                            <TextField label="Value" labelHidden placeholder="Value to match" value={selectedField.skipValue || ''} onChange={(v) => updateSelectedField('skipValue', v)} autoComplete="off" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <FieldGeneralSettings selectedField={selectedField} updateSelectedField={updateSelectedField} onOpenPicker={(type: 'media'|'icon', cb: (url: string) => void) => setActivePicker({ type, callback: cb })} />
              )
            )}

            {rightTab === 'style' && selectedField?.type !== 'hidden' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--p-color-border-subdued)' }}>
                  {['default', 'hover', 'focus', 'error', 'disabled'].map(st => (
                    <div key={st} onClick={() => setStyleState(st as any)} style={{ padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', backgroundColor: styleState === st ? '#202223' : 'transparent', color: styleState === st ? '#ffffff' : 'var(--p-color-text)', fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>
                      {st}
                    </div>
                  ))}
                </div>

                {!selectedField && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    {(() => {
                      const getGS = (k: string) => resolvedGlobalStyles[styleState === 'default' ? k : `${k}_${styleState}`] || (styleState !== 'default' ? resolvedGlobalStyles[k] : undefined);
                      
                      return (
                      <>
                        <Accordion title={`1. Form Section / Outer Wrapper (${styleState})`} defaultOpen={styleState === 'default'}>
                          <ColorControl label="Background color" value={getGS('wrapper_bg') || 'transparent'} darkValue={getGS('wrapper_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('wrapper_bg_dark', v, styleState)} />
                          <SliderControl label="Background opacity" value={getGS('wrapper_bg_opacity') || '1'} onChange={(v:any) => updateGlobalStyle('wrapper_bg_opacity', v, styleState)} min={0} max={1} step={0.1} />
                          <TextField label="Background image URL" value={getGS('wrapper_bg_img') || ''} onChange={(v) => updateGlobalStyle('wrapper_bg_img', v, styleState)} autoComplete="off" />
                          <div style={{ marginBottom: '20px' }}><Select label="Background position" options={[{label:'Center',value:'center'},{label:'Top Left',value:'top left'},{label:'Bottom Right',value:'bottom right'}]} value={getGS('wrapper_bg_pos') || 'center'} onChange={(v) => updateGlobalStyle('wrapper_bg_pos', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Background size" options={[{label:'Cover',value:'cover'},{label:'Contain',value:'contain'},{label:'Auto',value:'auto'}]} value={getGS('wrapper_bg_size') || 'cover'} onChange={(v) => updateGlobalStyle('wrapper_bg_size', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Background repeat" options={[{label:'No Repeat',value:'no-repeat'},{label:'Repeat',value:'repeat'}]} value={getGS('wrapper_bg_repeat') || 'no-repeat'} onChange={(v) => updateGlobalStyle('wrapper_bg_repeat', v, styleState)} /></div>
                          <FourWaySpacingControl label="Padding" value={getGS('wrapper_padding') || '0px'} mobileValue={getGS('wrapper_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_padding_mobile', v, styleState)} />
                          <FourWaySpacingControl label="Margin" value={getGS('wrapper_margin') || '0px auto'} mobileValue={getGS('wrapper_margin_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_margin', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_margin_mobile', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Horizontal alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={getGS('wrapper_align') || 'center'} onChange={(v) => updateGlobalStyle('wrapper_align', v, styleState)} /></div>
                          <SliderControl label="Width" value={getGS('wrapper_width') || '100%'} mobileValue={getGS('wrapper_width_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_width', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_width_mobile', v, styleState)} min={10} max={100} defaultUnit="%" />
                          <ResponsiveTextField label="Min width" value={getGS('wrapper_minWidth') || ''} mobileValue={getGS('wrapper_minWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_minWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_minWidth_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max width" value={getGS('wrapper_maxWidth') || '1200px'} mobileValue={getGS('wrapper_maxWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_maxWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_maxWidth_mobile', v, styleState)} />
                          <ResponsiveTextField label="Height" value={getGS('wrapper_height') || 'auto'} mobileValue={getGS('wrapper_height_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_height', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_height_mobile', v, styleState)} />
                          <ResponsiveTextField label="Min height" value={getGS('wrapper_minHeight') || ''} mobileValue={getGS('wrapper_minHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_minHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_minHeight_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max height" value={getGS('wrapper_maxHeight') || ''} mobileValue={getGS('wrapper_maxHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('wrapper_maxHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('wrapper_maxHeight_mobile', v, styleState)} />
                        </Accordion>

                        <Accordion title={`2. Form Container / Card (${styleState})`} defaultOpen={false}>
                          <ColorControl label="Card background" value={getGS('container_bg') || '#ffffff'} darkValue={getGS('container_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('container_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('container_bg_dark', v, styleState)} />
                          <SliderControl label="Background opacity" value={getGS('container_bg_opacity') || '1'} onChange={(v:any) => updateGlobalStyle('container_bg_opacity', v, styleState)} min={0} max={1} step={0.1} />
                          <TextField label="Background image URL" value={getGS('container_bg_img') || ''} onChange={(v) => updateGlobalStyle('container_bg_img', v, styleState)} autoComplete="off" />
                          <FourWaySpacingControl label="Card padding" value={getGS('padding') || '32px'} mobileValue={getGS('padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('padding_mobile', v, styleState)} />
                          <FourWaySpacingControl label="Border radius" value={getGS('radius') || '8px'} mobileValue={getGS('radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('radius_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Border</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Border style" options={[{label:'None',value:'none'},{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'},{label:'Dotted',value:'dotted'},{label:'Double',value:'double'}]} value={getGS('container_borderStyle') || 'none'} onChange={(v) => updateGlobalStyle('container_borderStyle', v, styleState)} /></div>
                          <ColorControl label="Border color" value={getGS('container_borderColor') || '#e2e8f0'} darkValue={getGS('container_borderColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('container_borderColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('container_borderColor_dark', v, styleState)} />
                          <FourWaySpacingControl label="Border width" value={getGS('container_borderWidth') || '0px'} mobileValue={getGS('container_borderWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_borderWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_borderWidth_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Shadow & Outline</div>
                          <ShadowControl label="Box shadow" value={getGS('container_shadow') || ''} onChange={(v:any) => updateGlobalStyle('container_shadow', v, styleState)} />
                          <SliderControl label="Outline width" value={getGS('container_outlineWidth') || '0px'} mobileValue={getGS('container_outlineWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_outlineWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_outlineWidth_mobile', v, styleState)} min={0} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Outline style" options={[{label:'None',value:'none'},{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'}]} value={getGS('container_outlineStyle') || 'none'} onChange={(v) => updateGlobalStyle('container_outlineStyle', v, styleState)} /></div>
                          <ColorControl label="Outline color" value={getGS('container_outlineColor') || '#000000'} darkValue={getGS('container_outlineColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('container_outlineColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('container_outlineColor_dark', v, styleState)} />
                          <SliderControl label="Outline offset" value={getGS('container_outlineOffset') || '0px'} mobileValue={getGS('container_outlineOffset_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_outlineOffset', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_outlineOffset_mobile', v, styleState)} min={0} max={20} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Glass Effect & Dimensions & Overflow</div>
                          <SliderControl label="Backdrop blur (px)" value={getGS('container_blur') || '0px'} onChange={(v:any) => updateGlobalStyle('container_blur', v, styleState)} min={0} max={50} />
                          <div style={{ marginBottom: '20px' }}><Select label="Overflow" options={[{label:'Visible',value:'visible'},{label:'Hidden',value:'hidden'},{label:'Scroll',value:'scroll'},{label:'Auto',value:'auto'}]} value={getGS('container_overflow') || 'visible'} onChange={(v) => updateGlobalStyle('container_overflow', v, styleState)} /></div>
                          <ResponsiveTextField label="Width" value={getGS('container_width') || '100%'} mobileValue={getGS('container_width_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_width', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_width_mobile', v, styleState)} />
                          <ResponsiveTextField label="Min width" value={getGS('container_minWidth') || ''} mobileValue={getGS('container_minWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_minWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_minWidth_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max width" value={getGS('container_maxWidth') || ''} mobileValue={getGS('container_maxWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_maxWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_maxWidth_mobile', v, styleState)} />
                          <ResponsiveTextField label="Min height" value={getGS('container_minHeight') || ''} mobileValue={getGS('container_minHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_minHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_minHeight_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max height" value={getGS('container_maxHeight') || ''} mobileValue={getGS('container_maxHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('container_maxHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('container_maxHeight_mobile', v, styleState)} />
                        </Accordion>

                        <Accordion title={`3. Form Header (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Header Alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={getGS('title_align') || 'center'} onChange={(v) => updateGlobalStyle('title_align', v, styleState)} /></div>
                          <FourWaySpacingControl label="Header padding" value={getGS('header_padding') || '0px'} mobileValue={getGS('header_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('header_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('header_padding_mobile', v, styleState)} />
                          <ColorControl label="Header background" value={getGS('header_bg') || 'transparent'} darkValue={getGS('header_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('header_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('header_bg_dark', v, styleState)} />
                          <SliderControl label="Bottom border width" value={getGS('header_borderBottomWidth') || '0px'} mobileValue={getGS('header_borderBottomWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('header_borderBottomWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('header_borderBottomWidth_mobile', v, styleState)} min={0} max={10} />
                          <div style={{ marginBottom: '20px' }}><Select label="Bottom border style" options={[{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'}]} value={getGS('header_borderBottomStyle') || 'solid'} onChange={(v) => updateGlobalStyle('header_borderBottomStyle', v, styleState)} /></div>
                          <ColorControl label="Bottom border color" value={getGS('header_borderBottomColor') || '#e2e8f0'} darkValue={getGS('header_borderBottomColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('header_borderBottomColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('header_borderBottomColor_dark', v, styleState)} />

                          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #e2e8f0', marginBottom: '12px', marginTop: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                              Form Title
                              <Checkbox label="Show" checked={getGS('title_show') !== false} onChange={(v) => updateGlobalStyle('title_show', v, styleState)} />
                            </div>
                            <div style={{ marginBottom: '12px' }}><Select label="Font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'},{label:'Outfit',value:'Outfit, sans-serif'}]} value={getGS('headingFontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('headingFontFamily', v, styleState)} /></div>
                            <SliderControl label="Font size" value={getGS('title_size') || '24px'} mobileValue={getGS('title_size_mobile') || ''} onChange={(v:any) => updateGlobalStyle('title_size', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('title_size_mobile', v, styleState)} min={12} max={64} />
                            <div style={{ marginBottom: '12px' }}><Select label="Font weight" options={[{label:'Normal',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'},{label:'Black',value:'900'}]} value={getGS('title_weight') || '700'} onChange={(v) => updateGlobalStyle('title_weight', v, styleState)} /></div>
                            <div style={{ marginBottom: '12px' }}><Select label="Font style" options={[{label:'Normal',value:'normal'},{label:'Italic',value:'italic'}]} value={getGS('title_style') || 'normal'} onChange={(v) => updateGlobalStyle('title_style', v, styleState)} /></div>
                            <ColorControl label="Text color" value={getGS('title_color') || '#000000'} darkValue={getGS('title_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('title_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('title_color_dark', v, styleState)} />
                            <ResponsiveTextField label="Letter spacing" value={getGS('title_letterSpacing') || '0px'} mobileValue={getGS('title_letterSpacing_mobile') || ''} onChange={(v:any) => updateGlobalStyle('title_letterSpacing', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('title_letterSpacing_mobile', v, styleState)} />
                            <SliderControl label="Line height" value={getGS('title_lineHeight') || '1.25'} mobileValue={getGS('title_lineHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('title_lineHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('title_lineHeight_mobile', v, styleState)} min={1} max={3} />
                            <div style={{ marginBottom: '12px' }}><Select label="Text transform" options={[{label:'None',value:'none'},{label:'Uppercase',value:'uppercase'},{label:'Lowercase',value:'lowercase'},{label:'Capitalize',value:'capitalize'}]} value={getGS('title_transform') || 'none'} onChange={(v) => updateGlobalStyle('title_transform', v, styleState)} /></div>
                            <div style={{ marginBottom: '12px' }}><Select label="Text decoration" options={[{label:'None',value:'none'},{label:'Underline',value:'underline'},{label:'Strikethrough',value:'line-through'}]} value={getGS('title_decoration') || 'none'} onChange={(v) => updateGlobalStyle('title_decoration', v, styleState)} /></div>
                            <ResponsiveTextField label="Bottom margin" value={getGS('title_marginBottom') || '8px'} mobileValue={getGS('title_marginBottom_mobile') || ''} onChange={(v:any) => updateGlobalStyle('title_marginBottom', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('title_marginBottom_mobile', v, styleState)} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                              Form Subtitle
                              <Checkbox label="Show" checked={getGS('subtitle_show') !== false} onChange={(v) => updateGlobalStyle('subtitle_show', v, styleState)} />
                            </div>
                            <div style={{ marginBottom: '12px' }}><Select label="Font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'},{label:'Outfit',value:'Outfit, sans-serif'}]} value={getGS('subtitle_fontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('subtitle_fontFamily', v, styleState)} /></div>
                            <SliderControl label="Font size" value={getGS('subtitle_size') || '14px'} mobileValue={getGS('subtitle_size_mobile') || ''} onChange={(v:any) => updateGlobalStyle('subtitle_size', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('subtitle_size_mobile', v, styleState)} min={10} max={32} />
                            <div style={{ marginBottom: '12px' }}><Select label="Font weight" options={[{label:'Normal',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('subtitle_weight') || '400'} onChange={(v) => updateGlobalStyle('subtitle_weight', v, styleState)} /></div>
                            <div style={{ marginBottom: '12px' }}><Select label="Font style" options={[{label:'Normal',value:'normal'},{label:'Italic',value:'italic'}]} value={getGS('subtitle_style') || 'normal'} onChange={(v) => updateGlobalStyle('subtitle_style', v, styleState)} /></div>
                            <ColorControl label="Text color" value={getGS('subtitle_color') || '#475569'} darkValue={getGS('subtitle_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('subtitle_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('subtitle_color_dark', v, styleState)} />
                            <ResponsiveTextField label="Letter spacing" value={getGS('subtitle_letterSpacing') || '0px'} mobileValue={getGS('subtitle_letterSpacing_mobile') || ''} onChange={(v:any) => updateGlobalStyle('subtitle_letterSpacing', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('subtitle_letterSpacing_mobile', v, styleState)} />
                            <SliderControl label="Line height" value={getGS('subtitle_lineHeight') || '1.5'} mobileValue={getGS('subtitle_lineHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('subtitle_lineHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('subtitle_lineHeight_mobile', v, styleState)} min={1} max={3} />
                          </div>
                        </Accordion>
                        
                        <Accordion title={`4. Form Layout (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Layout mode" options={[{label:'1 Column (Full Width)',value:'1'},{label:'2 Columns (Half Width)',value:'2'}]} value={getGS('columns') || '1'} onChange={(v) => updateGlobalStyle('columns', v, styleState)} /></div>
                          <SliderControl label="Column gap" value={getGS('gap') || '16px'} mobileValue={getGS('gap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('gap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('gap_mobile', v, styleState)} min={0} max={64} />
                          <SliderControl label="Row gap" value={getGS('rowGap') || '16px'} mobileValue={getGS('rowGap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('rowGap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('rowGap_mobile', v, styleState)} min={0} max={64} />
                          <div style={{ marginBottom: '20px' }}><Select label="Label position" options={[{label:'Top',value:'top'},{label:'Left',value:'left'},{label:'Right',value:'right'},{label:'Floating',value:'floating'}]} value={getGS('labelPosition') || 'top'} onChange={(v) => updateGlobalStyle('labelPosition', v, styleState)} /></div>
                          <SliderControl label="Label gap" value={getGS('labelGap') || '4px'} mobileValue={getGS('labelGap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('labelGap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('labelGap_mobile', v, styleState)} min={0} max={32} />
                          <div style={{ marginBottom: '20px' }}><Select label="Direction" options={[{label:'Left to Right (LTR)',value:'ltr'},{label:'Right to Left (RTL)',value:'rtl'}]} value={getGS('direction') || 'ltr'} onChange={(v) => updateGlobalStyle('direction', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Vertical rhythm preset" options={[{label:'Compact',value:'compact'},{label:'Comfortable',value:'comfortable'},{label:'Spacious',value:'spacious'}]} value={getGS('verticalRhythm') || 'comfortable'} onChange={(v) => updateGlobalStyle('verticalRhythm', v, styleState)} /></div>
                        </Accordion>
                        
                        <Accordion title={`5. Global Typography (${styleState})`} defaultOpen={styleState === 'default'}>
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Labels</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Label font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('label_fontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('label_fontFamily', v, styleState)} /></div>
                          <SliderControl label="Label size" value={getGS('label_fontSize') || '14px'} onChange={(v:any) => updateGlobalStyle('label_fontSize', v, styleState)} min={10} max={24} />
                          <div style={{ marginBottom: '20px' }}><Select label="Label weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('label_fontWeight') || '500'} onChange={(v) => updateGlobalStyle('label_fontWeight', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Label transform" options={[{label:'None',value:'none'},{label:'Uppercase',value:'uppercase'},{label:'Lowercase',value:'lowercase'},{label:'Capitalize',value:'capitalize'}]} value={getGS('label_transform') || 'none'} onChange={(v) => updateGlobalStyle('label_transform', v, styleState)} /></div>
                          <ColorControl label="Label color" value={getGS('label_color') || '#202223'} onChange={(v:any) => updateGlobalStyle('label_color', v, styleState)} />
                          <SliderControl label="Label margin bottom" value={getGS('label_marginBottom') || '4px'} onChange={(v:any) => updateGlobalStyle('label_marginBottom', v, styleState)} min={0} max={20} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Help Text</div>
                          <SliderControl label="Help text size" value={getGS('help_fontSize') || '12px'} onChange={(v:any) => updateGlobalStyle('help_fontSize', v, styleState)} min={10} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Help text weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('help_fontWeight') || '400'} onChange={(v) => updateGlobalStyle('help_fontWeight', v, styleState)} /></div>
                          <ColorControl label="Help text color" value={getGS('help_color') || '#6d7175'} onChange={(v:any) => updateGlobalStyle('help_color', v, styleState)} />
                          <SliderControl label="Help text line height" value={getGS('help_lineHeight') || '1.4'} onChange={(v:any) => updateGlobalStyle('help_lineHeight', v, styleState)} min={1} max={2} step={0.1} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Required Asterisk</div>
                          <ColorControl label="Asterisk color" value={getGS('asterisk_color') || '#d92d20'} onChange={(v:any) => updateGlobalStyle('asterisk_color', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Asterisk style" options={[{label:'* (Asterisk)',value:'asterisk'},{label:'(required)',value:'text'}]} value={getGS('asterisk_style') || 'asterisk'} onChange={(v) => updateGlobalStyle('asterisk_style', v, styleState)} /></div>
                        </Accordion>

                        <Accordion title={`6. Standard Input Fields (${styleState})`} defaultOpen={false}>
                          <ColorControl label="Background" value={getGS('input_bg') || '#ffffff'} darkValue={getGS('input_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_bg_dark', v, styleState)} />
                          <ColorControl label="Border color" value={getGS('input_border') || '#cbd5e0'} darkValue={getGS('input_border_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_border', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_border_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Border style" options={[{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'},{label:'Dotted',value:'dotted'},{label:'None',value:'none'}]} value={getGS('input_borderStyle') || 'solid'} onChange={(v) => updateGlobalStyle('input_borderStyle', v, styleState)} /></div>
                          <SliderControl label="Border width" value={getGS('input_border_width') || '1px'} mobileValue={getGS('input_border_width_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_border_width', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_border_width_mobile', v, styleState)} min={0} max={10} />
                          <FourWaySpacingControl label="Border radius" value={getGS('input_radius') || '8px'} mobileValue={getGS('input_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_radius_mobile', v, styleState)} />
                          <FourWaySpacingControl label="Padding" value={getGS('input_padding') || '12px 16px'} mobileValue={getGS('input_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_padding_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Dimensions</div>
                          <ResponsiveTextField label="Height (optional)" value={getGS('input_height') || ''} mobileValue={getGS('input_height_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_height', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_height_mobile', v, styleState)} />
                          <ResponsiveTextField label="Min height" value={getGS('input_minHeight') || ''} mobileValue={getGS('input_minHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_minHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_minHeight_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max height" value={getGS('input_maxHeight') || ''} mobileValue={getGS('input_maxHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_maxHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_maxHeight_mobile', v, styleState)} />
                          <ResponsiveTextField label="Width (optional)" value={getGS('input_width') || ''} mobileValue={getGS('input_width_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_width', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_width_mobile', v, styleState)} />
                          <ResponsiveTextField label="Min width" value={getGS('input_minWidth') || ''} mobileValue={getGS('input_minWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_minWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_minWidth_mobile', v, styleState)} />
                          <ResponsiveTextField label="Max width" value={getGS('input_maxWidth') || ''} mobileValue={getGS('input_maxWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_maxWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_maxWidth_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Typography</div>
                          <ColorControl label="Text color" value={getGS('input_color') || '#202223'} darkValue={getGS('input_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_color_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('input_fontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('input_fontFamily', v, styleState)} /></div>
                          <SliderControl label="Font size" value={getGS('input_fontSize') || '16px'} mobileValue={getGS('input_fontSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_fontSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_fontSize_mobile', v, styleState)} min={12} max={32} />
                          <div style={{ marginBottom: '20px' }}><Select label="Font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('input_fontWeight') || '400'} onChange={(v) => updateGlobalStyle('input_fontWeight', v, styleState)} /></div>
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Shadow & Outline</div>
                          <ShadowControl label="Box shadow" value={getGS('input_shadow') || ''} onChange={(v:any) => updateGlobalStyle('input_shadow', v, styleState)} />
                          <SliderControl label="Outline width" value={getGS('input_outlineWidth') || '0px'} mobileValue={getGS('input_outlineWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_outlineWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_outlineWidth_mobile', v, styleState)} min={0} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Outline style" options={[{label:'None',value:'none'},{label:'Solid',value:'solid'},{label:'Dashed',value:'dashed'}]} value={getGS('input_outlineStyle') || 'none'} onChange={(v) => updateGlobalStyle('input_outlineStyle', v, styleState)} /></div>
                          <ColorControl label="Outline color" value={getGS('input_outlineColor') || '#000000'} darkValue={getGS('input_outlineColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_outlineColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_outlineColor_dark', v, styleState)} />
                          <SliderControl label="Outline offset" value={getGS('input_outlineOffset') || '0px'} mobileValue={getGS('input_outlineOffset_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_outlineOffset', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_outlineOffset_mobile', v, styleState)} min={0} max={20} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Other</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Textarea resize" options={[{label:'Vertical',value:'vertical'},{label:'Both',value:'both'},{label:'None',value:'none'}]} value={getGS('input_resize') || 'vertical'} onChange={(v) => updateGlobalStyle('input_resize', v, styleState)} /></div>
                          <ResponsiveTextField label="Transition duration" value={getGS('input_transitionDuration') || '0.2s'} onChange={(v:any) => updateGlobalStyle('input_transitionDuration', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Transition easing" options={[{label:'Ease',value:'ease'},{label:'Linear',value:'linear'},{label:'Ease-in-out',value:'ease-in-out'}]} value={getGS('input_transitionEasing') || 'ease'} onChange={(v) => updateGlobalStyle('input_transitionEasing', v, styleState)} /></div>
                        </Accordion>

                        <Accordion title={`7. Input State Styling (${styleState})`} defaultOpen={false}>
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Hover State</div>
                          <ColorControl label="Hover background" value={getGS('input_hoverBg') || ''} darkValue={getGS('input_hoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_hoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_hoverBg_dark', v, styleState)} />
                          <ColorControl label="Hover border color" value={getGS('input_hoverBorder') || '#94a3b8'} darkValue={getGS('input_hoverBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_hoverBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_hoverBorder_dark', v, styleState)} />
                          <ShadowControl label="Hover box shadow" value={getGS('input_hoverShadow') || ''} onChange={(v:any) => updateGlobalStyle('input_hoverShadow', v, styleState)} />
                          <ColorControl label="Hover text color" value={getGS('input_hoverColor') || ''} darkValue={getGS('input_hoverColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_hoverColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_hoverColor_dark', v, styleState)} />
                          <ColorControl label="Hover outline color" value={getGS('input_hoverOutlineColor') || ''} darkValue={getGS('input_hoverOutlineColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_hoverOutlineColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_hoverOutlineColor_dark', v, styleState)} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Focus State</div>
                          <ColorControl label="Focus background" value={getGS('input_focusBg') || ''} darkValue={getGS('input_focusBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_focusBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_focusBg_dark', v, styleState)} />
                          <ColorControl label="Focus border color" value={getGS('input_focusBorder') || '#6366f1'} darkValue={getGS('input_focusBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_focusBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_focusBorder_dark', v, styleState)} />
                          <ShadowControl label="Focus box shadow" value={getGS('input_focusShadow') || ''} onChange={(v:any) => updateGlobalStyle('input_focusShadow', v, styleState)} />
                          <ColorControl label="Focus text color" value={getGS('input_focusColor') || ''} darkValue={getGS('input_focusColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_focusColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_focusColor_dark', v, styleState)} />
                          <ColorControl label="Focus outline color" value={getGS('input_focusOutlineColor') || ''} darkValue={getGS('input_focusOutlineColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_focusOutlineColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_focusOutlineColor_dark', v, styleState)} />
                          <ColorControl label="Focus ring color" value={getGS('input_focusRingColor') || 'rgba(99,102,241,0.18)'} darkValue={getGS('input_focusRingColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_focusRingColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_focusRingColor_dark', v, styleState)} />
                          <SliderControl label="Focus ring width" value={getGS('input_focusRingWidth') || '3px'} mobileValue={getGS('input_focusRingWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_focusRingWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_focusRingWidth_mobile', v, styleState)} min={0} max={10} />
                          <SliderControl label="Focus ring offset" value={getGS('input_focusRingOffset') || '0px'} mobileValue={getGS('input_focusRingOffset_mobile') || ''} onChange={(v:any) => updateGlobalStyle('input_focusRingOffset', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('input_focusRingOffset_mobile', v, styleState)} min={0} max={10} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Error State</div>
                          <ColorControl label="Error background" value={getGS('input_errorBg') || ''} darkValue={getGS('input_errorBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_errorBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_errorBg_dark', v, styleState)} />
                          <ColorControl label="Error border color" value={getGS('input_errorBorder') || '#ef4444'} darkValue={getGS('input_errorBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_errorBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_errorBorder_dark', v, styleState)} />
                          <ColorControl label="Error text color" value={getGS('input_errorColor') || '#202223'} darkValue={getGS('input_errorColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_errorColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_errorColor_dark', v, styleState)} />
                          <ShadowControl label="Error box shadow" value={getGS('input_errorShadow') || ''} onChange={(v:any) => updateGlobalStyle('input_errorShadow', v, styleState)} />
                          <ColorControl label="Error outline color" value={getGS('input_errorOutlineColor') || ''} darkValue={getGS('input_errorOutlineColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_errorOutlineColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_errorOutlineColor_dark', v, styleState)} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Disabled State</div>
                          <ColorControl label="Disabled background" value={getGS('input_disabledBg') || '#f8fafc'} darkValue={getGS('input_disabledBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_disabledBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_disabledBg_dark', v, styleState)} />
                          <ColorControl label="Disabled border color" value={getGS('input_disabledBorder') || '#e2e8f0'} darkValue={getGS('input_disabledBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_disabledBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_disabledBorder_dark', v, styleState)} />
                          <ColorControl label="Disabled text color" value={getGS('input_disabledColor') || ''} darkValue={getGS('input_disabledColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('input_disabledColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('input_disabledColor_dark', v, styleState)} />
                          <SliderControl label="Disabled opacity" value={getGS('input_disabledOpacity') || '0.6'} onChange={(v:any) => updateGlobalStyle('input_disabledOpacity', v, styleState)} min={0} max={1} step={0.1} />
                        </Accordion>

                        <Accordion title={`8. Placeholder Styling (${styleState})`} defaultOpen={false}>
                          <ColorControl label="Placeholder color" value={getGS('placeholder_color') || '#94a3b8'} darkValue={getGS('placeholder_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('placeholder_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('placeholder_color_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Placeholder font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('placeholder_fontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('placeholder_fontFamily', v, styleState)} /></div>
                          <SliderControl label="Placeholder font size" value={getGS('placeholder_fontSize') || 'inherit'} mobileValue={getGS('placeholder_fontSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('placeholder_fontSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('placeholder_fontSize_mobile', v, styleState)} min={10} max={24} />
                          <div style={{ marginBottom: '20px' }}><Select label="Placeholder font weight" options={[{label:'Inherit',value:'inherit'},{label:'Regular',value:'400'},{label:'Medium',value:'500'}]} value={getGS('placeholder_fontWeight') || 'inherit'} onChange={(v) => updateGlobalStyle('placeholder_fontWeight', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Placeholder font style" options={[{label:'Normal',value:'normal'},{label:'Italic',value:'italic'}]} value={getGS('placeholder_fontStyle') || 'normal'} onChange={(v) => updateGlobalStyle('placeholder_fontStyle', v, styleState)} /></div>
                          <ResponsiveTextField label="Letter spacing" value={getGS('placeholder_letterSpacing') || '0px'} mobileValue={getGS('placeholder_letterSpacing_mobile') || ''} onChange={(v:any) => updateGlobalStyle('placeholder_letterSpacing', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('placeholder_letterSpacing_mobile', v, styleState)} />
                          <SliderControl label="Placeholder opacity" value={getGS('placeholder_opacity') || '1'} onChange={(v:any) => updateGlobalStyle('placeholder_opacity', v, styleState)} min={0} max={1} step={0.1} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Animation</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Animation style (on focus)" options={[{label:'None',value:'none'},{label:'Fade Out',value:'fade'},{label:'Slide Up',value:'slide-up'},{label:'Slide Right',value:'slide-right'}]} value={getGS('placeholder_animation') || 'none'} onChange={(v) => updateGlobalStyle('placeholder_animation', v, styleState)} /></div>
                          <ResponsiveTextField label="Animation duration" value={getGS('placeholder_animationDuration') || '0.2s'} onChange={(v:any) => updateGlobalStyle('placeholder_animationDuration', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Animation easing" options={[{label:'Ease',value:'ease'},{label:'Linear',value:'linear'},{label:'Ease-in-out',value:'ease-in-out'}]} value={getGS('placeholder_animationEasing') || 'ease'} onChange={(v) => updateGlobalStyle('placeholder_animationEasing', v, styleState)} /></div>
                        </Accordion>
                        
                        <Accordion title={`9. Select / Dropdown (${styleState})`} defaultOpen={false}>
                          <ColorControl label="Trigger background" value={getGS('select_bg') || 'var(--nf-input-bg)'} darkValue={getGS('select_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_bg_dark', v, styleState)} />
                          <ColorControl label="Trigger border color" value={getGS('select_border') || 'var(--nf-input-border)'} darkValue={getGS('select_border_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_border', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_border_dark', v, styleState)} />
                          <ColorControl label="Trigger text color" value={getGS('select_color') || 'var(--nf-input-color)'} darkValue={getGS('select_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_color_dark', v, styleState)} />
                          <SliderControl label="Trigger border radius" value={getGS('select_radius') || 'var(--nf-input-radius)'} mobileValue={getGS('select_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_radius_mobile', v, styleState)} min={0} max={50} />
                          <SliderControl label="Trigger border width" value={getGS('select_borderWidth') || 'var(--nf-input-border-width)'} mobileValue={getGS('select_borderWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_borderWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_borderWidth_mobile', v, styleState)} min={0} max={10} />
                          <FourWaySpacingControl label="Trigger padding" value={getGS('select_padding') || 'var(--nf-input-padding)'} mobileValue={getGS('select_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_padding_mobile', v, styleState)} />
                          <ShadowControl label="Trigger box shadow" value={getGS('select_shadow') || 'var(--nf-input-shadow)'} onChange={(v:any) => updateGlobalStyle('select_shadow', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Hover / Focus</div>
                          <ColorControl label="Hover background" value={getGS('select_hoverBg') || 'var(--nf-input-hover-bg)'} darkValue={getGS('select_hoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_hoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_hoverBg_dark', v, styleState)} />
                          <ColorControl label="Hover border color" value={getGS('select_hoverBorder') || 'var(--nf-input-hover-border)'} darkValue={getGS('select_hoverBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_hoverBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_hoverBorder_dark', v, styleState)} />
                          <ColorControl label="Focus ring color" value={getGS('select_focusRing') || 'var(--nf-input-focus-ring-color)'} darkValue={getGS('select_focusRing_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_focusRing', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_focusRing_dark', v, styleState)} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Indicator Icon</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Icon type" options={[{label:'Chevron',value:'chevron'},{label:'Caret',value:'caret'},{label:'Plus',value:'plus'}]} value={getGS('select_icon') || 'chevron'} onChange={(v) => updateGlobalStyle('select_icon', v, styleState)} /></div>
                          <ColorControl label="Icon color" value={getGS('select_iconColor') || '#64748b'} darkValue={getGS('select_iconColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_iconColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_iconColor_dark', v, styleState)} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Dropdown Panel</div>
                          <ColorControl label="Panel background" value={getGS('select_panelBg') || '#ffffff'} darkValue={getGS('select_panelBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_panelBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_panelBg_dark', v, styleState)} />
                          <ResponsiveTextField label="Panel border" value={getGS('select_panelBorder') || '1px solid #e2e8f0'} onChange={(v:any) => updateGlobalStyle('select_panelBorder', v, styleState)} />
                          <ShadowControl label="Panel box shadow" value={getGS('select_panelShadow') || '0 10px 15px -3px rgba(0,0,0,0.1)'} onChange={(v:any) => updateGlobalStyle('select_panelShadow', v, styleState)} />
                          <SliderControl label="Panel border radius" value={getGS('select_panelRadius') || '8px'} mobileValue={getGS('select_panelRadius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_panelRadius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_panelRadius_mobile', v, styleState)} min={0} max={30} />
                          <ResponsiveTextField label="Panel max height" value={getGS('select_panelMaxHeight') || '240px'} mobileValue={getGS('select_panelMaxHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_panelMaxHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_panelMaxHeight_mobile', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Panel entrance animation" options={[{label:'Fade',value:'fade'},{label:'Slide down',value:'slide-down'},{label:'Scale up',value:'scale-up'}]} value={getGS('select_panelAnimation') || 'slide-down'} onChange={(v) => updateGlobalStyle('select_panelAnimation', v, styleState)} /></div>

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Options</div>
                          <SliderControl label="Option font size" value={getGS('select_optionSize') || '14px'} mobileValue={getGS('select_optionSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('select_optionSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('select_optionSize_mobile', v, styleState)} min={10} max={24} />
                          <ColorControl label="Option text color" value={getGS('select_optionColor') || '#1e293b'} darkValue={getGS('select_optionColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_optionColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_optionColor_dark', v, styleState)} />
                          <ColorControl label="Option hover background" value={getGS('select_optionHoverBg') || '#f1f5f9'} darkValue={getGS('select_optionHoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_optionHoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_optionHoverBg_dark', v, styleState)} />
                          <ColorControl label="Option hover text color" value={getGS('select_optionHoverColor') || '#1e293b'} darkValue={getGS('select_optionHoverColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_optionHoverColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_optionHoverColor_dark', v, styleState)} />
                          <ColorControl label="Option selected background" value={getGS('select_optionSelectedBg') || '#e0e7ff'} darkValue={getGS('select_optionSelectedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_optionSelectedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_optionSelectedBg_dark', v, styleState)} />
                          <ColorControl label="Option selected text color" value={getGS('select_optionSelectedColor') || '#4f46e5'} darkValue={getGS('select_optionSelectedColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('select_optionSelectedColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('select_optionSelectedColor_dark', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`10. Radio Buttons (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Layout direction" options={[{label:'Vertical (Column)',value:'column'},{label:'Horizontal (Row)',value:'row'}]} value={getGS('radio_direction') || 'column'} onChange={(v) => updateGlobalStyle('radio_direction', v, styleState)} /></div>
                          <ResponsiveTextField label="Gap between items" value={getGS('radio_gap') || '12px'} mobileValue={getGS('radio_gap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('radio_gap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('radio_gap_mobile', v, styleState)} />
                          <SliderControl label="Radio size" value={getGS('radio_size') || '18px'} mobileValue={getGS('radio_size_mobile') || ''} onChange={(v:any) => updateGlobalStyle('radio_size', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('radio_size_mobile', v, styleState)} min={12} max={32} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Colors</div>
                          <ColorControl label="Unchecked border color" value={getGS('radio_uncheckedBorder') || '#cbd5e1'} darkValue={getGS('radio_uncheckedBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_uncheckedBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_uncheckedBorder_dark', v, styleState)} />
                          <ColorControl label="Unchecked background" value={getGS('radio_uncheckedBg') || '#ffffff'} darkValue={getGS('radio_uncheckedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_uncheckedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_uncheckedBg_dark', v, styleState)} />
                          <ColorControl label="Checked border color" value={getGS('radio_checkedBorder') || '#6366f1'} darkValue={getGS('radio_checkedBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_checkedBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_checkedBorder_dark', v, styleState)} />
                          <ColorControl label="Checked background" value={getGS('radio_checkedBg') || '#6366f1'} darkValue={getGS('radio_checkedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_checkedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_checkedBg_dark', v, styleState)} />
                          <ColorControl label="Dot color" value={getGS('radio_dotColor') || '#ffffff'} darkValue={getGS('radio_dotColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_dotColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_dotColor_dark', v, styleState)} />
                          <ColorControl label="Focus ring color" value={getGS('radio_focusRing') || 'rgba(99,102,241,0.2)'} darkValue={getGS('radio_focusRing_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_focusRing', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_focusRing_dark', v, styleState)} />
                          <ColorControl label="Row hover background" value={getGS('radio_hoverBg') || 'transparent'} darkValue={getGS('radio_hoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_hoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_hoverBg_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Label Settings</div>
                          <ResponsiveTextField label="Label spacing" value={getGS('radio_labelGap') || '8px'} mobileValue={getGS('radio_labelGap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('radio_labelGap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('radio_labelGap_mobile', v, styleState)} />
                          <SliderControl label="Label font size" value={getGS('radio_labelSize') || '14px'} mobileValue={getGS('radio_labelSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('radio_labelSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('radio_labelSize_mobile', v, styleState)} min={10} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Label font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('radio_labelWeight') || '400'} onChange={(v) => updateGlobalStyle('radio_labelWeight', v, styleState)} /></div>
                          <ColorControl label="Label text color" value={getGS('radio_labelColor') || '#334155'} darkValue={getGS('radio_labelColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('radio_labelColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('radio_labelColor_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Animation</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Animation style" options={[{label:'Bounce pop',value:'bounce'},{label:'Fade fill',value:'fade'},{label:'None',value:'none'}]} value={getGS('radio_animation') || 'bounce'} onChange={(v) => updateGlobalStyle('radio_animation', v, styleState)} /></div>
                          <ResponsiveTextField label="Transition duration" value={getGS('radio_transition') || '0.2s'} onChange={(v:any) => updateGlobalStyle('radio_transition', v, styleState)} />
                        </Accordion>

                        <Accordion title={`11. Checkboxes (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Layout direction" options={[{label:'Vertical (Column)',value:'column'},{label:'Horizontal (Row)',value:'row'}]} value={getGS('checkbox_direction') || 'column'} onChange={(v) => updateGlobalStyle('checkbox_direction', v, styleState)} /></div>
                          <ResponsiveTextField label="Gap between items" value={getGS('checkbox_gap') || '12px'} mobileValue={getGS('checkbox_gap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_gap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('checkbox_gap_mobile', v, styleState)} />
                          <SliderControl label="Checkbox size" value={getGS('checkbox_size') || '18px'} mobileValue={getGS('checkbox_size_mobile') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_size', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('checkbox_size_mobile', v, styleState)} min={12} max={32} />
                          <SliderControl label="Border radius" value={getGS('checkbox_radius') || '4px'} mobileValue={getGS('checkbox_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('checkbox_radius_mobile', v, styleState)} min={0} max={16} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Colors</div>
                          <ColorControl label="Unchecked border color" value={getGS('checkbox_uncheckedBorder') || '#cbd5e1'} darkValue={getGS('checkbox_uncheckedBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_uncheckedBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_uncheckedBorder_dark', v, styleState)} />
                          <ColorControl label="Unchecked background" value={getGS('checkbox_uncheckedBg') || '#ffffff'} darkValue={getGS('checkbox_uncheckedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_uncheckedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_uncheckedBg_dark', v, styleState)} />
                          <ColorControl label="Checked border color" value={getGS('checkbox_checkedBorder') || '#6366f1'} darkValue={getGS('checkbox_checkedBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_checkedBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_checkedBorder_dark', v, styleState)} />
                          <ColorControl label="Checked background" value={getGS('checkbox_checkedBg') || '#6366f1'} darkValue={getGS('checkbox_checkedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_checkedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_checkedBg_dark', v, styleState)} />
                          <ColorControl label="Checkmark color" value={getGS('checkbox_checkColor') || '#ffffff'} darkValue={getGS('checkbox_checkColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_checkColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_checkColor_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Checkmark style" options={[{label:'Default',value:'default'},{label:'Bold',value:'bold'},{label:'Thin',value:'thin'}]} value={getGS('checkbox_checkStyle') || 'default'} onChange={(v) => updateGlobalStyle('checkbox_checkStyle', v, styleState)} /></div>
                          <ColorControl label="Focus ring color" value={getGS('checkbox_focusRing') || 'rgba(99,102,241,0.2)'} darkValue={getGS('checkbox_focusRing_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_focusRing', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_focusRing_dark', v, styleState)} />
                          <ColorControl label="Row hover background" value={getGS('checkbox_hoverBg') || 'transparent'} darkValue={getGS('checkbox_hoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_hoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_hoverBg_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Label Settings</div>
                          <ResponsiveTextField label="Label spacing" value={getGS('checkbox_labelGap') || '8px'} mobileValue={getGS('checkbox_labelGap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_labelGap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('checkbox_labelGap_mobile', v, styleState)} />
                          <SliderControl label="Label font size" value={getGS('checkbox_labelSize') || '14px'} mobileValue={getGS('checkbox_labelSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_labelSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('checkbox_labelSize_mobile', v, styleState)} min={10} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Label font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('checkbox_labelWeight') || '400'} onChange={(v) => updateGlobalStyle('checkbox_labelWeight', v, styleState)} /></div>
                          <ColorControl label="Label text color" value={getGS('checkbox_labelColor') || '#334155'} darkValue={getGS('checkbox_labelColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_labelColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_labelColor_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Animation</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Animation style" options={[{label:'Bounce pop',value:'bounce'},{label:'Draw stroke',value:'draw'},{label:'Fade fill',value:'fade'},{label:'None',value:'none'}]} value={getGS('checkbox_animation') || 'bounce'} onChange={(v) => updateGlobalStyle('checkbox_animation', v, styleState)} /></div>
                          <ResponsiveTextField label="Transition duration" value={getGS('checkbox_transition') || '0.2s'} onChange={(v:any) => updateGlobalStyle('checkbox_transition', v, styleState)} />
                          <ColorControl label="Indeterminate background" value={getGS('checkbox_indetBg') || '#cbd5e1'} darkValue={getGS('checkbox_indetBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('checkbox_indetBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('checkbox_indetBg_dark', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`12. Validation Errors (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Error position" options={[{label:'Below field',value:'below'},{label:'Top of form',value:'top'}]} value={getGS('error_position') || 'below'} onChange={(v) => updateGlobalStyle('error_position', v, styleState)} /></div>
                          <ColorControl label="Error message text color" value={getGS('error_textColor') || '#ef4444'} onChange={(v:any) => updateGlobalStyle('error_textColor', v, styleState)} />
                          <SliderControl label="Error message font size" value={getGS('error_fontSize') || '12px'} onChange={(v:any) => updateGlobalStyle('error_fontSize', v, styleState)} min={10} max={20} />
                          <div style={{ marginBottom: '20px' }}><Select label="Error message font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('error_fontWeight') || '500'} onChange={(v) => updateGlobalStyle('error_fontWeight', v, styleState)} /></div>
                          <Checkbox label="Show error icon" checked={getGS('error_showIcon') !== false} onChange={(v) => updateGlobalStyle('error_showIcon', v, styleState)} />
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Error Box (Optional)</div>
                          <ColorControl label="Error box background" value={getGS('error_bg') || 'transparent'} onChange={(v:any) => updateGlobalStyle('error_bg', v, styleState)} />
                          <FourWaySpacingControl label="Error box padding" value={getGS('error_padding') || '0px'} onChange={(v:any) => updateGlobalStyle('error_padding', v, styleState)} />
                          <SliderControl label="Error box border radius" value={getGS('error_radius') || '0px'} onChange={(v:any) => updateGlobalStyle('error_radius', v, styleState)} min={0} max={20} />
                        </Accordion>

                        <Accordion title={`13. Date Picker (${styleState})`} defaultOpen={false}>
                          <ColorControl label="Calendar icon color" value={getGS('date_iconColor') || '#64748b'} darkValue={getGS('date_iconColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_iconColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_iconColor_dark', v, styleState)} />
                          <SliderControl label="Calendar icon size" value={getGS('date_iconSize') || '16px'} mobileValue={getGS('date_iconSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('date_iconSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('date_iconSize_mobile', v, styleState)} min={12} max={32} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Calendar Panel</div>
                          <ColorControl label="Panel background" value={getGS('date_panelBg') || '#ffffff'} darkValue={getGS('date_panelBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_panelBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_panelBg_dark', v, styleState)} />
                          <ResponsiveTextField label="Panel border" value={getGS('date_panelBorder') || '1px solid #e2e8f0'} onChange={(v:any) => updateGlobalStyle('date_panelBorder', v, styleState)} />
                          <ShadowControl label="Panel shadow" value={getGS('date_panelShadow') || '0 10px 15px -3px rgba(0,0,0,0.1)'} onChange={(v:any) => updateGlobalStyle('date_panelShadow', v, styleState)} />
                          <SliderControl label="Panel border radius" value={getGS('date_panelRadius') || '8px'} mobileValue={getGS('date_panelRadius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('date_panelRadius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('date_panelRadius_mobile', v, styleState)} min={0} max={30} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Calendar Elements</div>
                          <ColorControl label="Day cell hover background" value={getGS('date_dayHoverBg') || '#f1f5f9'} darkValue={getGS('date_dayHoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_dayHoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_dayHoverBg_dark', v, styleState)} />
                          <ColorControl label="Selected day background" value={getGS('date_selectedBg') || '#4f46e5'} darkValue={getGS('date_selectedBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_selectedBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_selectedBg_dark', v, styleState)} />
                          <ColorControl label="Selected day text color" value={getGS('date_selectedColor') || '#ffffff'} darkValue={getGS('date_selectedColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_selectedColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_selectedColor_dark', v, styleState)} />
                          <ColorControl label="Today highlight color" value={getGS('date_todayColor') || '#4f46e5'} darkValue={getGS('date_todayColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_todayColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_todayColor_dark', v, styleState)} />
                          <ColorControl label="Month/Year header color" value={getGS('date_headerColor') || '#0f172a'} darkValue={getGS('date_headerColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_headerColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_headerColor_dark', v, styleState)} />
                          <ColorControl label="Navigation arrow color" value={getGS('date_arrowColor') || '#64748b'} darkValue={getGS('date_arrowColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('date_arrowColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('date_arrowColor_dark', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`14. File Upload (${styleState})`} defaultOpen={false}>
                          <ResponsiveTextField label="Drop zone height" value={getGS('file_height') || '120px'} mobileValue={getGS('file_height_mobile') || ''} onChange={(v:any) => updateGlobalStyle('file_height', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('file_height_mobile', v, styleState)} />
                          <ColorControl label="Drop zone background" value={getGS('file_bg') || '#f8fafc'} darkValue={getGS('file_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_bg_dark', v, styleState)} />
                          <ResponsiveTextField label="Drop zone border" value={getGS('file_border') || '2px dashed #cbd5e1'} onChange={(v:any) => updateGlobalStyle('file_border', v, styleState)} />
                          <SliderControl label="Drop zone border radius" value={getGS('file_radius') || '8px'} mobileValue={getGS('file_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('file_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('file_radius_mobile', v, styleState)} min={0} max={30} />
                          <ColorControl label="Active drag background" value={getGS('file_activeBg') || '#f0f9ff'} darkValue={getGS('file_activeBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_activeBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_activeBg_dark', v, styleState)} />
                          <ColorControl label="Active drag border" value={getGS('file_activeBorder') || '#38bdf8'} darkValue={getGS('file_activeBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_activeBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_activeBorder_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Icon & Text</div>
                          <ColorControl label="Icon color" value={getGS('file_iconColor') || '#94a3b8'} darkValue={getGS('file_iconColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_iconColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_iconColor_dark', v, styleState)} />
                          <SliderControl label="Icon size" value={getGS('file_iconSize') || '24px'} mobileValue={getGS('file_iconSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('file_iconSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('file_iconSize_mobile', v, styleState)} min={16} max={64} />
                          <ColorControl label="Instruction text color" value={getGS('file_textColor') || '#64748b'} darkValue={getGS('file_textColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_textColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_textColor_dark', v, styleState)} />
                          <div style={{ padding: '8px 0 12px', fontSize: '12px', color: '#64748b' }}>The "Browse" button inherits global Button styles.</div>
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Attached File Chip</div>
                          <ColorControl label="File chip background" value={getGS('file_chipBg') || '#f1f5f9'} darkValue={getGS('file_chipBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_chipBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_chipBg_dark', v, styleState)} />
                          <ColorControl label="File chip text color" value={getGS('file_chipColor') || '#334155'} darkValue={getGS('file_chipColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_chipColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_chipColor_dark', v, styleState)} />
                          <SliderControl label="File chip border radius" value={getGS('file_chipRadius') || '4px'} mobileValue={getGS('file_chipRadius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('file_chipRadius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('file_chipRadius_mobile', v, styleState)} min={0} max={20} />
                          <ColorControl label="Remove icon color" value={getGS('file_removeColor') || '#ef4444'} darkValue={getGS('file_removeColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('file_removeColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('file_removeColor_dark', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`15. Rating / Star Widget (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Icon type" options={[{label:'Star',value:'star'},{label:'Heart',value:'heart'},{label:'Thumb',value:'thumb'}]} value={getGS('rating_icon') || 'star'} onChange={(v) => updateGlobalStyle('rating_icon', v, styleState)} /></div>
                          <SliderControl label="Icon size" value={getGS('rating_size') || '24px'} mobileValue={getGS('rating_size_mobile') || ''} onChange={(v:any) => updateGlobalStyle('rating_size', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('rating_size_mobile', v, styleState)} min={16} max={64} />
                          <ResponsiveTextField label="Gap between icons" value={getGS('rating_gap') || '4px'} mobileValue={getGS('rating_gap_mobile') || ''} onChange={(v:any) => updateGlobalStyle('rating_gap', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('rating_gap_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Colors</div>
                          <ColorControl label="Unselected color" value={getGS('rating_unselected') || '#cbd5e1'} darkValue={getGS('rating_unselected_dark') || ''} onChange={(v:any) => updateGlobalStyle('rating_unselected', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('rating_unselected_dark', v, styleState)} />
                          <ColorControl label="Selected color" value={getGS('rating_selected') || '#eab308'} darkValue={getGS('rating_selected_dark') || ''} onChange={(v:any) => updateGlobalStyle('rating_selected', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('rating_selected_dark', v, styleState)} />
                          <ColorControl label="Hover color" value={getGS('rating_hover') || '#facc15'} darkValue={getGS('rating_hover_dark') || ''} onChange={(v:any) => updateGlobalStyle('rating_hover', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('rating_hover_dark', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Animation</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Animation style" options={[{label:'Bounce',value:'bounce'},{label:'Scale pop',value:'scale'},{label:'Shake',value:'shake'},{label:'None',value:'none'}]} value={getGS('rating_animation') || 'scale'} onChange={(v) => updateGlobalStyle('rating_animation', v, styleState)} /></div>
                          <ResponsiveTextField label="Transition duration" value={getGS('rating_transition') || '0.2s'} onChange={(v:any) => updateGlobalStyle('rating_transition', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`16. Submit Buttons (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Button style preset" options={[{label:'Solid',value:'solid'},{label:'Outline',value:'outline'},{label:'Ghost',value:'ghost'},{label:'Soft',value:'soft'},{label:'Pill',value:'pill'}]} value={getGS('submit_preset') || 'solid'} onChange={(v) => updateGlobalStyle('submit_preset', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Width" options={[{label:'Auto',value:'auto'},{label:'Full width (100%)',value:'100%'},{label:'Fixed px',value:'fixed'}]} value={getGS('submit_width') || 'auto'} onChange={(v) => updateGlobalStyle('submit_width', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={getGS('submit_align') || 'left'} onChange={(v) => updateGlobalStyle('submit_align', v, styleState)} /></div>
                          
                          <ColorControl label="Background color" value={getGS('submit_bg') || '#000000'} darkValue={getGS('submit_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_bg_dark', v, styleState)} />
                          <ColorControl label="Text color" value={getGS('submit_color') || '#ffffff'} darkValue={getGS('submit_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_color_dark', v, styleState)} />
                          <ResponsiveTextField label="Border style & color" value={getGS('submit_border') || 'none'} onChange={(v:any) => updateGlobalStyle('submit_border', v, styleState)} />
                          
                          <FourWaySpacingControl label="Padding" value={getGS('submit_padding') || '13px 32px'} mobileValue={getGS('submit_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_padding_mobile', v, styleState)} />
                          <SliderControl label="Height" value={getGS('submit_height') || 'auto'} mobileValue={getGS('submit_height_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_height', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_height_mobile', v, styleState)} min={20} max={100} />
                          <ResponsiveTextField label="Min width" value={getGS('submit_minWidth') || 'none'} mobileValue={getGS('submit_minWidth_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_minWidth', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_minWidth_mobile', v, styleState)} />
                          <FourWaySpacingControl label="Border radius" value={getGS('submit_radius') || '8px'} mobileValue={getGS('submit_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_radius_mobile', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Typography</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('submit_fontFamily') || 'inherit'} onChange={(v) => updateGlobalStyle('submit_fontFamily', v, styleState)} /></div>
                          <SliderControl label="Font size" value={getGS('submit_fontSize') || '15px'} mobileValue={getGS('submit_fontSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_fontSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_fontSize_mobile', v, styleState)} min={12} max={30} />
                          <div style={{ marginBottom: '20px' }}><Select label="Font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('submit_fontWeight') || '600'} onChange={(v) => updateGlobalStyle('submit_fontWeight', v, styleState)} /></div>
                          <ResponsiveTextField label="Letter spacing" value={getGS('submit_letterSpacing') || '0px'} mobileValue={getGS('submit_letterSpacing_mobile') || ''} onChange={(v:any) => updateGlobalStyle('submit_letterSpacing', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('submit_letterSpacing_mobile', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Text transform" options={[{label:'None',value:'none'},{label:'Uppercase',value:'uppercase'},{label:'Capitalize',value:'capitalize'}]} value={getGS('submit_textTransform') || 'none'} onChange={(v) => updateGlobalStyle('submit_textTransform', v, styleState)} /></div>
                          
                          <ShadowControl label="Box shadow" value={getGS('submit_shadow') || '0 4px 14px rgba(0,0,0,0.1)'} onChange={(v:any) => updateGlobalStyle('submit_shadow', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Hover State</div>
                          <ColorControl label="Hover background" value={getGS('submit_hoverBg') || '#333333'} darkValue={getGS('submit_hoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_hoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_hoverBg_dark', v, styleState)} />
                          <ColorControl label="Hover border color" value={getGS('submit_hoverBorder') || 'transparent'} darkValue={getGS('submit_hoverBorder_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_hoverBorder', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_hoverBorder_dark', v, styleState)} />
                          <ColorControl label="Hover text color" value={getGS('submit_hoverColor') || '#ffffff'} darkValue={getGS('submit_hoverColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_hoverColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_hoverColor_dark', v, styleState)} />
                          <ShadowControl label="Hover box shadow" value={getGS('submit_hoverShadow') || '0 4px 14px rgba(0,0,0,0.2)'} onChange={(v:any) => updateGlobalStyle('submit_hoverShadow', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Hover transform" options={[{label:'None',value:'none'},{label:'Lift (translateY)',value:'lift'},{label:'Scale Up',value:'scale-up'},{label:'Scale Down',value:'scale-down'}]} value={getGS('submit_hoverTransform') || 'none'} onChange={(v) => updateGlobalStyle('submit_hoverTransform', v, styleState)} /></div>
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Active State (Pressed)</div>
                          <ColorControl label="Active background" value={getGS('submit_activeBg') || '#000000'} darkValue={getGS('submit_activeBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_activeBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_activeBg_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Active transform" options={[{label:'None',value:'none'},{label:'Press down (scale 0.97)',value:'press'}]} value={getGS('submit_activeTransform') || 'press'} onChange={(v) => updateGlobalStyle('submit_activeTransform', v, styleState)} /></div>
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Animation & Icons</div>
                          <ResponsiveTextField label="Transition duration" value={getGS('submit_transitionDuration') || '0.2s'} onChange={(v:any) => updateGlobalStyle('submit_transitionDuration', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Transition easing" options={[{label:'Ease',value:'ease'},{label:'Linear',value:'linear'},{label:'Ease-in-out',value:'ease-in-out'}]} value={getGS('submit_transitionEasing') || 'ease'} onChange={(v) => updateGlobalStyle('submit_transitionEasing', v, styleState)} /></div>
                          <Checkbox label="Show icon (Arrow)" checked={getGS('submit_showIcon') !== false} onChange={(v) => updateGlobalStyle('submit_showIcon', v, styleState)} />

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Disabled & Loading</div>
                          <ColorControl label="Disabled background" value={getGS('submit_disabledBg') || '#e2e8f0'} darkValue={getGS('submit_disabledBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('submit_disabledBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('submit_disabledBg_dark', v, styleState)} />
                          <SliderControl label="Disabled opacity" value={getGS('submit_disabledOpacity') || '0.7'} onChange={(v:any) => updateGlobalStyle('submit_disabledOpacity', v, styleState)} min={0} max={1} step={0.1} />
                          <ColorControl label="Loading spinner color" value={getGS('spinner_color') || '#ffffff'} darkValue={getGS('spinner_color_dark') || ''} onChange={(v:any) => updateGlobalStyle('spinner_color', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('spinner_color_dark', v, styleState)} />
                          <TextField label="Loading text" placeholder="Submitting..." value={getGS('submit_loadingText') || ''} onChange={(v) => updateGlobalStyle('submit_loadingText', v, styleState)} autoComplete="off" />
                        </Accordion>
                        
                        <Accordion title={`17. Multi-Step Navigation (${styleState})`} defaultOpen={false}>
                          <div style={{ padding: '10px 12px', marginBottom: '12px', backgroundColor: '#f0f4ff', borderRadius: '6px', fontSize: '12px', color: '#3b5fc0' }}>Controls the look of multi-step forms. Single-page forms are unaffected.</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Progress indicator style" options={[{label:'Dots (numbered circles)',value:'dots'},{label:'Progress bar',value:'bar'},{label:'Numbered counter (01 — 04)',value:'numbered'},{label:'None',value:'none'}]} value={getGS('step_progressStyle') || 'dots'} onChange={(v) => updateGlobalStyle('step_progressStyle', v, styleState)} /></div>
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Progress Bar Track</div>
                          <ColorControl label="Track background" value={getGS('step_trackColor') || '#e2e8f0'} darkValue={getGS('step_trackColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_trackColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_trackColor_dark', v, styleState)} />
                          <SliderControl label="Track height" value={getGS('step_trackHeight') || '4px'} mobileValue={getGS('step_trackHeight_mobile') || ''} onChange={(v:any) => updateGlobalStyle('step_trackHeight', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('step_trackHeight_mobile', v, styleState)} min={2} max={20} />
                          <SliderControl label="Track border radius" value={getGS('step_trackRadius') || '4px'} mobileValue={getGS('step_trackRadius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('step_trackRadius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('step_trackRadius_mobile', v, styleState)} min={0} max={20} />
                          <ColorControl label="Fill color" value={getGS('step_fillColor') || '#7c3aed'} darkValue={getGS('step_fillColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_fillColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_fillColor_dark', v, styleState)} />
                          <SliderControl label="Fill border radius" value={getGS('step_fillRadius') || '4px'} mobileValue={getGS('step_fillRadius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('step_fillRadius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('step_fillRadius_mobile', v, styleState)} min={0} max={20} />
                          <ResponsiveTextField label="Fill transition duration" value={getGS('step_fillTransition') || '0.3s'} onChange={(v:any) => updateGlobalStyle('step_fillTransition', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Step Indicators</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Step indicator style" options={[{label:'Dots',value:'dots'},{label:'Numbers',value:'numbers'},{label:'None',value:'none'}]} value={getGS('step_indicatorStyle') || 'dots'} onChange={(v) => updateGlobalStyle('step_indicatorStyle', v, styleState)} /></div>
                          <ColorControl label="Label color" value={getGS('step_counterColor') || '#7c3aed'} darkValue={getGS('step_counterColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_counterColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_counterColor_dark', v, styleState)} />
                          <SliderControl label="Label font size" value={getGS('step_counterSize') || '14px'} mobileValue={getGS('step_counterSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('step_counterSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('step_counterSize_mobile', v, styleState)} min={10} max={24} />
                          <ColorControl label="Active step color" value={getGS('step_activeColor') || '#7c3aed'} darkValue={getGS('step_activeColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_activeColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_activeColor_dark', v, styleState)} />
                          <ColorControl label="Completed step color" value={getGS('step_completedColor') || '#7c3aed'} darkValue={getGS('step_completedColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_completedColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_completedColor_dark', v, styleState)} />
                          <div style={{ marginBottom: '20px' }}><Select label="Step transition animation" options={[{label:'Fade',value:'fade'},{label:'Slide (left/right)',value:'slide'},{label:'None',value:'none'}]} value={getGS('step_transition') || 'fade'} onChange={(v) => updateGlobalStyle('step_transition', v, styleState)} /></div>

                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Navigation Buttons</div>
                          <TextField label="Continue button label" placeholder="Continue" value={getGS('step_continueLabel') || ''} onChange={(v) => updateGlobalStyle('step_continueLabel', v, styleState)} autoComplete="off" />
                          <div style={{ marginTop: '12px', marginBottom: '12px' }}><TextField label="Back button label" placeholder="Back" value={getGS('step_backLabel') || ''} onChange={(v) => updateGlobalStyle('step_backLabel', v, styleState)} autoComplete="off" /></div>
                          <ColorControl label="Back button background" value={getGS('step_backBg') || '#e2e8f0'} darkValue={getGS('step_backBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_backBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_backBg_dark', v, styleState)} />
                          <ColorControl label="Back button text color" value={getGS('step_backColor') || '#334155'} darkValue={getGS('step_backColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_backColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_backColor_dark', v, styleState)} />
                          <ColorControl label="Back button hover background" value={getGS('step_backHoverBg') || '#cbd5e1'} darkValue={getGS('step_backHoverBg_dark') || ''} onChange={(v:any) => updateGlobalStyle('step_backHoverBg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('step_backHoverBg_dark', v, styleState)} />
                        </Accordion>
                        
                        <Accordion title={`18. Success Message / Thank-You (${styleState})`} defaultOpen={false}>
                          <div style={{ marginBottom: '20px' }}><Select label="Display type" options={[{label:'Inline replace',value:'inline'},{label:'Toast notification',value:'toast'},{label:'Redirect to URL',value:'redirect'}]} value={getGS('success_displayType') || 'inline'} onChange={(v) => updateGlobalStyle('success_displayType', v, styleState)} /></div>
                          <ColorControl label="Background color" value={getGS('success_bg') || '#f0fdf4'} darkValue={getGS('success_bg_dark') || ''} onChange={(v:any) => updateGlobalStyle('success_bg', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('success_bg_dark', v, styleState)} />
                          <SliderControl label="Border radius" value={getGS('success_radius') || '12px'} mobileValue={getGS('success_radius_mobile') || ''} onChange={(v:any) => updateGlobalStyle('success_radius', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('success_radius_mobile', v, styleState)} min={0} max={50} />
                          <ResponsiveTextField label="Border" value={getGS('success_border') || '1px solid #bbf7d0'} onChange={(v:any) => updateGlobalStyle('success_border', v, styleState)} />
                          <FourWaySpacingControl label="Padding" value={getGS('success_padding') || '24px 32px'} mobileValue={getGS('success_padding_mobile') || ''} onChange={(v:any) => updateGlobalStyle('success_padding', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('success_padding_mobile', v, styleState)} />
                          <ShadowControl label="Box shadow" value={getGS('success_shadow') || 'none'} onChange={(v:any) => updateGlobalStyle('success_shadow', v, styleState)} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Typography</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Text alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={getGS('success_textAlign') || 'center'} onChange={(v) => updateGlobalStyle('success_textAlign', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px' }}><Select label="Headline font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('success_titleFont') || 'inherit'} onChange={(v) => updateGlobalStyle('success_titleFont', v, styleState)} /></div>
                          <ColorControl label="Headline color" value={getGS('success_titleColor') || '#166534'} darkValue={getGS('success_titleColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('success_titleColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('success_titleColor_dark', v, styleState)} />
                          <SliderControl label="Headline font size" value={getGS('success_titleSize') || '24px'} mobileValue={getGS('success_titleSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('success_titleSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('success_titleSize_mobile', v, styleState)} min={14} max={48} />
                          <div style={{ marginBottom: '20px' }}><Select label="Headline font weight" options={[{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getGS('success_titleWeight') || '600'} onChange={(v) => updateGlobalStyle('success_titleWeight', v, styleState)} /></div>
                          <div style={{ marginBottom: '20px', marginTop: '12px' }}><Select label="Body font family" options={[{label:'Inherit',value:'inherit'},{label:'Inter',value:'Inter, sans-serif'},{label:'Roboto',value:'Roboto, sans-serif'}]} value={getGS('success_bodyFont') || 'inherit'} onChange={(v) => updateGlobalStyle('success_bodyFont', v, styleState)} /></div>
                          <ColorControl label="Body color" value={getGS('success_bodyColor') || '#15803d'} darkValue={getGS('success_bodyColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('success_bodyColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('success_bodyColor_dark', v, styleState)} />
                          <SliderControl label="Body font size" value={getGS('success_bodySize') || '16px'} mobileValue={getGS('success_bodySize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('success_bodySize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('success_bodySize_mobile', v, styleState)} min={12} max={24} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Icon</div>
                          <Checkbox label="Show success icon" checked={getGS('success_showIcon') !== false} onChange={(v) => updateGlobalStyle('success_showIcon', v, styleState)} />
                          <div style={{ marginBottom: '20px', marginTop: '12px' }}><Select label="Icon style" options={[{label:'Checkmark circle',value:'check-circle'},{label:'Checkmark',value:'check'},{label:'Star',value:'star'}]} value={getGS('success_iconStyle') || 'check-circle'} onChange={(v) => updateGlobalStyle('success_iconStyle', v, styleState)} /></div>
                          <ColorControl label="Icon color" value={getGS('success_iconColor') || '#16a34a'} darkValue={getGS('success_iconColor_dark') || ''} onChange={(v:any) => updateGlobalStyle('success_iconColor', v, styleState)} onDarkChange={(v:any) => updateGlobalStyle('success_iconColor_dark', v, styleState)} />
                          <SliderControl label="Icon size" value={getGS('success_iconSize') || '48px'} mobileValue={getGS('success_iconSize_mobile') || ''} onChange={(v:any) => updateGlobalStyle('success_iconSize', v, styleState)} onMobileChange={(v:any) => updateGlobalStyle('success_iconSize_mobile', v, styleState)} min={24} max={96} />
                          
                          <div style={{ margin: '16px 0', borderTop: '1px solid #e2e8f0' }} />
                          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Entrance Animation</div>
                          <div style={{ marginBottom: '20px' }}><Select label="Animation style" options={[{label:'Fade In',value:'fade'},{label:'Slide Down',value:'slide-down'},{label:'Scale Up',value:'scale-up'},{label:'None',value:'none'}]} value={getGS('success_animation') || 'fade'} onChange={(v) => updateGlobalStyle('success_animation', v, styleState)} /></div>
                          <ResponsiveTextField label="Animation duration" value={getGS('success_animationDuration') || '0.4s'} onChange={(v:any) => updateGlobalStyle('success_animationDuration', v, styleState)} />
                        </Accordion>
                      </>
                      );
                    })()}
                  </div>
                )}

                {selectedField && (
                  <>
                    <div className="custom-label" style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Individual Field Override ({styleState})
                      <span style={{opacity: 0.5}}><Icon source={viewMode === 'mobile' ? MobileIcon : DesktopIcon} tone="base" /></span>
                    </div>

                    {!selectedField.customStyleEnabled && (
                      <div onClick={() => { setSelectedFieldId(null); setRightTab('style'); }} style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: 'var(--p-color-bg-surface-info)', borderRadius: '8px', fontSize: '13px', color: 'var(--p-color-text-info)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--p-color-border-info)' }}>
                        <span style={{ flex: 1 }}>Inheriting from Global Style</span>
                        <span style={{ textDecoration: 'underline' }}>Edit Global</span>
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '24px' }}>
                      <Checkbox label="Customize style for this field" checked={selectedField.customStyleEnabled} onChange={(v) => updateSelectedField('customStyleEnabled', v)} />
                    </div>

                    {selectedField.customStyleEnabled && (() => {
                      const getFS = (k: string) => resolveFieldStyle(selectedField.styles, viewMode, styleState)[k];
                      const updateFS = (k: string, v: any) => updateSelectedFieldStyle(k, v, styleState);
                      
                      return (
                        <>
                          {/* Universal Controls */}
                          <Accordion title={`Universal Controls (${styleState})`} defaultOpen={styleState === 'default'}>
                            <ColorControl label="Field background" value={getFS('input_bg') || ''} onChange={(v:any) => updateFS('input_bg', v)} />
                            <ColorControl label="Border color" value={getFS('input_border') || ''} onChange={(v:any) => updateFS('input_border', v)} />
                            <SliderControl label="Border width" value={getFS('input_border_width') || ''} onChange={(v:any) => updateFS('input_border_width', v)} min={0} max={10} />
                            <SliderControl label="Border radius" value={getFS('input_radius') || ''} onChange={(v:any) => updateFS('input_radius', v)} min={0} max={50} />
                            <FourWaySpacingControl label="Padding" value={getFS('input_padding') || ''} onChange={(v:any) => updateFS('input_padding', v)} />
                            <SliderControl label="Font size" value={getFS('input_fontSize') || ''} onChange={(v:any) => updateFS('input_fontSize', v)} min={12} max={32} />
                            <div style={{ marginBottom: '20px' }}><Select label="Font weight" options={[{label:'Inherit',value:''},{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getFS('input_fontWeight') || ''} onChange={(v) => updateFS('input_fontWeight', v)} /></div>
                            <ColorControl label="Text color" value={getFS('input_color') || ''} onChange={(v:any) => updateFS('input_color', v)} />
                            <ColorControl label="Label color" value={getFS('label_color') || ''} onChange={(v:any) => updateFS('label_color', v)} />
                            <SliderControl label="Label size" value={getFS('label_fontSize') || ''} onChange={(v:any) => updateFS('label_fontSize', v)} min={10} max={24} />
                            <div style={{ marginBottom: '20px' }}><Select label="Label weight" options={[{label:'Inherit',value:''},{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getFS('label_fontWeight') || ''} onChange={(v) => updateFS('label_fontWeight', v)} /></div>
                            <ColorControl label="Help-text color" value={getFS('help_color') || ''} onChange={(v:any) => updateFS('help_color', v)} />
                            <SliderControl label="Help-text size" value={getFS('help_fontSize') || ''} onChange={(v:any) => updateFS('help_fontSize', v)} min={10} max={20} />
                            <ShadowControl label="Box-shadow preset" value={getFS('input_shadow') || ''} onChange={(v:any) => updateFS('input_shadow', v)} />
                          </Accordion>

                          {/* Field Specific Controls */}
                          {(() => {
                            const basicTypes = ['text', 'email', 'url', 'number', 'phone', 'textarea', 'password', 'lookup', 'order', 'address', 'quantity', 'calculated'];
                            const isBasic = basicTypes.includes(selectedField.type);
                            
                            return (
                              <>
                                {isBasic && (
                                  <Accordion title={`Input Behavior (${styleState})`} defaultOpen={true}>
                                    {styleState === 'default' && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <Checkbox label="Enable Floating Label Animation" checked={selectedField.floatingLabel} onChange={(v) => updateSelectedField('floatingLabel', v)} />
                                      </div>
                                    )}
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'container' && (
                                  <Accordion title={`Container Styling (${styleState})`} defaultOpen={true}>
                                    <FourWaySpacingControl label="Margin" value={getFS('margin') || '0px'} onChange={(v:any) => updateFS('margin', v)} />
                                    <ColorControl label="Background Color" value={getFS('bg') || ''} onChange={(v:any) => updateFS('bg', v)} />
                                    <ShadowControl label="Box Shadow" value={getFS('boxShadow') || ''} onChange={(v:any) => updateFS('boxShadow', v)} />
                                    <SliderControl label="Gap between items" value={getFS('gap') || '16px'} onChange={(v:any) => updateFS('gap', v)} min={0} max={100} />
                                  </Accordion>
                                )}
                                
                                {(selectedField.type === 'heading' || selectedField.type === 'paragraph') && (
                                  <Accordion title={`Typography (${styleState})`} defaultOpen={true}>
                                    <div style={{ marginBottom: '20px' }}><Select label="Text Alignment" options={[{label:'Left',value:'left'},{label:'Center',value:'center'},{label:'Right',value:'right'}]} value={getFS('textAlign') || 'left'} onChange={(v) => updateFS('textAlign', v)} /></div>
                                    <FourWaySpacingControl label="Margin" value={getFS('margin') || '0px'} onChange={(v:any) => updateFS('margin', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'number' && (
                                  <Accordion title={`Number Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Prefix/Suffix Color" value={getFS('prefixColor') || ''} onChange={(v:any) => updateFS('prefixColor', v)} />
                                    {styleState === 'default' && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <Checkbox label="Show Up/Down Arrows" checked={selectedField.showSpinners !== false} onChange={(v) => updateSelectedField('showSpinners', v)} />
                                      </div>
                                    )}
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'phone' && (
                                  <Accordion title={`Phone Specific (${styleState})`} defaultOpen={true}>
                                    {styleState === 'default' && (
                                      <div style={{ marginBottom: '20px' }}>
                                        <Select label="Flag Style" options={[{label:'Rectangle',value:'rectangle'},{label:'Round',value:'round'},{label:'Hidden',value:'hidden'}]} value={selectedField.flagStyle || 'rectangle'} onChange={(v) => updateSelectedField('flagStyle', v)} />
                                      </div>
                                    )}
                                    <ColorControl label="Country Code Color" value={getFS('countryCodeColor') || ''} onChange={(v:any) => updateFS('countryCodeColor', v)} />
                                    <div style={{ marginBottom: '20px' }}><Select label="Country Code Weight" options={[{label:'Inherit',value:''},{label:'Regular',value:'400'},{label:'Medium',value:'500'},{label:'Bold',value:'700'}]} value={getFS('countryCodeWeight') || ''} onChange={(v) => updateFS('countryCodeWeight', v)} /></div>
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'textarea' && (
                                  <Accordion title={`Textarea Specific (${styleState})`} defaultOpen={true}>
                                    {styleState === 'default' && (
                                      <div style={{ marginBottom: '20px' }}>
                                        <Select label="Resize Behavior" options={[{label:'Vertical Only',value:'vertical'},{label:'Both',value:'both'},{label:'None',value:'none'}]} value={selectedField.resizeBehavior || 'vertical'} onChange={(v) => updateSelectedField('resizeBehavior', v)} />
                                      </div>
                                    )}
                                    <ColorControl label="Counter Text Color" value={getFS('counterColor') || ''} onChange={(v:any) => updateFS('counterColor', v)} />
                                    <SliderControl label="Counter Text Size" value={getFS('counterSize') || '12px'} onChange={(v:any) => updateFS('counterSize', v)} min={10} max={20} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'password' && (
                                  <Accordion title={`Password Specific (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Toggle Icon Color" value={getFS('toggleIconColor') || ''} onChange={(v:any) => updateFS('toggleIconColor', v)} />
                                    <SliderControl label="Toggle Icon Size" value={getFS('toggleIconSize') || '16px'} onChange={(v:any) => updateFS('toggleIconSize', v)} min={12} max={32} />
                                    <ColorControl label="Strength Meter Color (Weak)" value={getFS('strengthWeakColor') || ''} onChange={(v:any) => updateFS('strengthWeakColor', v)} />
                                    <ColorControl label="Strength Meter Color (Strong)" value={getFS('strengthStrongColor') || ''} onChange={(v:any) => updateFS('strengthStrongColor', v)} />
                                  </Accordion>
                                )}

                        {selectedField.type === 'checkbox' && (() => {
                          const mode = selectedField.displayMode || 'default';
                          return (
                            <>
                              {/* Checkbox — Default mode */}
                              {mode === 'default' && (
                                <Accordion title={`Checkbox Styling (${styleState})`} defaultOpen={true}>
                                  <ColorControl label="Checked Fill Color" value={getFS('checkedBg') || ''} onChange={(v:any) => updateFS('checkedBg', v)} />
                                  <ColorControl label="Checkmark Icon Color" value={getFS('checkIconColor') || ''} onChange={(v:any) => updateFS('checkIconColor', v)} />
                                  <div style={{ marginBottom: '20px' }}><Select label="Checkbox Shape" options={[{label:'Square',value:'square'},{label:'Rounded',value:'rounded'},{label:'Circle',value:'circle'}]} value={getFS('checkboxShape') || 'square'} onChange={(v) => updateFS('checkboxShape', v)} /></div>
                                  <SliderControl label="Checkbox Size" value={getFS('checkboxSize') || '16px'} onChange={(v:any) => updateFS('checkboxSize', v)} min={12} max={40} />
                                </Accordion>
                              )}
                              {/* Checkbox — Button mode */}
                              {mode === 'button' && (
                                <Accordion title={`Button Mode Styling (${styleState})`} defaultOpen={true}>
                                  <ColorControl label="Segment Background (Inactive)" value={getFS('btnSegmentBg') || ''} onChange={(v:any) => updateFS('btnSegmentBg', v)} />
                                  <ColorControl label="Segment Background (Active)" value={getFS('btnSegmentActiveBg') || ''} onChange={(v:any) => updateFS('btnSegmentActiveBg', v)} />
                                  <ColorControl label="Segment Background (Hover)" value={getFS('btnSegmentHoverBg') || ''} onChange={(v:any) => updateFS('btnSegmentHoverBg', v)} />
                                  <ColorControl label="Text Color (Inactive)" value={getFS('btnSegmentText') || ''} onChange={(v:any) => updateFS('btnSegmentText', v)} />
                                  <ColorControl label="Text Color (Active)" value={getFS('btnSegmentActiveText') || ''} onChange={(v:any) => updateFS('btnSegmentActiveText', v)} />
                                  <ColorControl label="Divider Color" value={getFS('btnDividerColor') || ''} onChange={(v:any) => updateFS('btnDividerColor', v)} />
                                  <ColorControl label="Selected Border Color" value={getFS('btnSelectedBorder') || ''} onChange={(v:any) => updateFS('btnSelectedBorder', v)} />
                                  <SliderControl label="Corner Radius" value={getFS('btnCornerRadius') || '4px'} onChange={(v:any) => updateFS('btnCornerRadius', v)} min={0} max={50} />
                                  <ColorControl label="Icon Color" value={getFS('btnIconColor') || ''} onChange={(v:any) => updateFS('btnIconColor', v)} />
                                </Accordion>
                              )}
                              {/* Checkbox — Image mode */}
                              {mode === 'image' && (
                                <Accordion title={`Image Mode Styling (${styleState})`} defaultOpen={true}>
                                  <SliderControl label="Tile Size" value={getFS('imgTileSize') || '120px'} onChange={(v:any) => updateFS('imgTileSize', v)} min={60} max={300} />
                                  <div style={{ marginBottom: '20px' }}><Select label="Aspect Ratio" options={[{label:'Square (1:1)',value:'1/1'},{label:'Landscape (4:3)',value:'4/3'},{label:'Portrait (3:4)',value:'3/4'},{label:'Wide (16:9)',value:'16/9'}]} value={getFS('imgTileAspect') || '1/1'} onChange={(v) => updateFS('imgTileAspect', v)} /></div>
                                  <div style={{ marginBottom: '20px' }}><Select label="Image Fit" options={[{label:'Cover',value:'cover'},{label:'Contain',value:'contain'}]} value={getFS('imgTileFit') || 'cover'} onChange={(v) => updateFS('imgTileFit', v)} /></div>
                                  <SliderControl label="Gap Between Tiles" value={getFS('imgTileGap') || '8px'} onChange={(v:any) => updateFS('imgTileGap', v)} min={0} max={40} />
                                  <ColorControl label="Selected Border Color" value={getFS('imgSelectedBorder') || ''} onChange={(v:any) => updateFS('imgSelectedBorder', v)} />
                                  <SliderControl label="Selected Border Width" value={getFS('imgSelectedBorderWidth') || '2px'} onChange={(v:any) => updateFS('imgSelectedBorderWidth', v)} min={1} max={8} />
                                  <ColorControl label="Selected Overlay Color" value={getFS('imgSelectedOverlay') || ''} onChange={(v:any) => updateFS('imgSelectedOverlay', v)} />
                                  <ColorControl label="Checkmark Badge Color" value={getFS('imgCheckmarkColor') || ''} onChange={(v:any) => updateFS('imgCheckmarkColor', v)} />
                                  <div style={{ marginBottom: '20px' }}><Select label="Label Position" options={[{label:'Below tile',value:'below'},{label:'Overlay on tile',value:'overlay'},{label:'Hidden',value:'hidden'}]} value={getFS('imgLabelPosition') || 'below'} onChange={(v) => updateFS('imgLabelPosition', v)} /></div>
                                </Accordion>
                              )}
                            </>
                          );
                        })()}

                        {selectedField.type === 'radio' && (() => {
                          const mode = selectedField.displayMode || 'default';
                          return (
                            <>
                              {/* Radio — Default mode */}
                              {mode === 'default' && (
                                <Accordion title={`Radio Styling (${styleState})`} defaultOpen={true}>
                                  <ColorControl label="Radio Dot Color" value={getFS('radioDotColor') || ''} onChange={(v:any) => updateFS('radioDotColor', v)} />
                                  <ColorControl label="Selected Ring Color" value={getFS('radioRingColor') || ''} onChange={(v:any) => updateFS('radioRingColor', v)} />
                                  <SliderControl label="Radio Size" value={getFS('radioSize') || '16px'} onChange={(v:any) => updateFS('radioSize', v)} min={12} max={40} />
                                </Accordion>
                              )}
                              {/* Radio — Button mode */}
                              {mode === 'button' && (
                                <Accordion title={`Button Mode Styling (${styleState})`} defaultOpen={true}>
                                  <ColorControl label="Segment Background (Inactive)" value={getFS('btnSegmentBg') || ''} onChange={(v:any) => updateFS('btnSegmentBg', v)} />
                                  <ColorControl label="Segment Background (Active)" value={getFS('btnSegmentActiveBg') || ''} onChange={(v:any) => updateFS('btnSegmentActiveBg', v)} />
                                  <ColorControl label="Segment Background (Hover)" value={getFS('btnSegmentHoverBg') || ''} onChange={(v:any) => updateFS('btnSegmentHoverBg', v)} />
                                  <ColorControl label="Text Color (Inactive)" value={getFS('btnSegmentText') || ''} onChange={(v:any) => updateFS('btnSegmentText', v)} />
                                  <ColorControl label="Text Color (Active)" value={getFS('btnSegmentActiveText') || ''} onChange={(v:any) => updateFS('btnSegmentActiveText', v)} />
                                  <ColorControl label="Divider Color" value={getFS('btnDividerColor') || ''} onChange={(v:any) => updateFS('btnDividerColor', v)} />
                                  <ColorControl label="Selected Border Color" value={getFS('btnSelectedBorder') || ''} onChange={(v:any) => updateFS('btnSelectedBorder', v)} />
                                  <SliderControl label="Corner Radius" value={getFS('btnCornerRadius') || '4px'} onChange={(v:any) => updateFS('btnCornerRadius', v)} min={0} max={50} />
                                  <ColorControl label="Icon Color" value={getFS('btnIconColor') || ''} onChange={(v:any) => updateFS('btnIconColor', v)} />
                                </Accordion>
                              )}
                              {/* Radio — Image mode */}
                              {mode === 'image' && (
                                <Accordion title={`Image Mode Styling (${styleState})`} defaultOpen={true}>
                                  <SliderControl label="Tile Size" value={getFS('imgTileSize') || '120px'} onChange={(v:any) => updateFS('imgTileSize', v)} min={60} max={300} />
                                  <div style={{ marginBottom: '20px' }}><Select label="Aspect Ratio" options={[{label:'Square (1:1)',value:'1/1'},{label:'Landscape (4:3)',value:'4/3'},{label:'Portrait (3:4)',value:'3/4'},{label:'Wide (16:9)',value:'16/9'}]} value={getFS('imgTileAspect') || '1/1'} onChange={(v) => updateFS('imgTileAspect', v)} /></div>
                                  <div style={{ marginBottom: '20px' }}><Select label="Image Fit" options={[{label:'Cover',value:'cover'},{label:'Contain',value:'contain'}]} value={getFS('imgTileFit') || 'cover'} onChange={(v) => updateFS('imgTileFit', v)} /></div>
                                  <SliderControl label="Gap Between Tiles" value={getFS('imgTileGap') || '8px'} onChange={(v:any) => updateFS('imgTileGap', v)} min={0} max={40} />
                                  <ColorControl label="Selected Border Color" value={getFS('imgSelectedBorder') || ''} onChange={(v:any) => updateFS('imgSelectedBorder', v)} />
                                  <SliderControl label="Selected Border Width" value={getFS('imgSelectedBorderWidth') || '2px'} onChange={(v:any) => updateFS('imgSelectedBorderWidth', v)} min={1} max={8} />
                                  <ColorControl label="Selected Overlay Color" value={getFS('imgSelectedOverlay') || ''} onChange={(v:any) => updateFS('imgSelectedOverlay', v)} />
                                  <ColorControl label="Checkmark Badge Color" value={getFS('imgCheckmarkColor') || ''} onChange={(v:any) => updateFS('imgCheckmarkColor', v)} />
                                  <div style={{ marginBottom: '20px' }}><Select label="Label Position" options={[{label:'Below tile',value:'below'},{label:'Overlay on tile',value:'overlay'},{label:'Hidden',value:'hidden'}]} value={getFS('imgLabelPosition') || 'below'} onChange={(v) => updateFS('imgLabelPosition', v)} /></div>
                                </Accordion>
                              )}
                            </>
                          );
                        })()}
                                
                                {['toggle', 'switch'].includes(selectedField.type) && (
                                  <Accordion title={`Toggle Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Track Color (On)" value={getFS('trackOnColor') || ''} onChange={(v:any) => updateFS('trackOnColor', v)} />
                                    <ColorControl label="Track Color (Off)" value={getFS('trackOffColor') || ''} onChange={(v:any) => updateFS('trackOffColor', v)} />
                                    <ColorControl label="Thumb Color" value={getFS('thumbColor') || ''} onChange={(v:any) => updateFS('thumbColor', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'select' && (
                                  <Accordion title={`Dropdown Styling (${styleState})`} defaultOpen={true}>
                                    <div style={{ marginBottom: '16px' }}>
                                      <Select label="Dropdown Action" options={[{label: 'Click', value: 'click'}, {label: 'Hover', value: 'hover'}]} value={selectedField.dropdownAction || 'click'} onChange={(v) => updateSelectedField('dropdownAction', v)} />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                      <AssetPickerControl label="Custom Arrow Icon" value={selectedField.dropdownIconUrl || ''} onOpenPicker={() => setActivePicker({ type: 'icon', callback: (url: string) => updateSelectedField('dropdownIconUrl', url) })} onRemove={() => updateSelectedField('dropdownIconUrl', '')} type="icon" />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                      <Checkbox label="Rotate Icon 180° when open" checked={selectedField.iconRotate} onChange={(v) => updateSelectedField('iconRotate', v)} />
                                    </div>
                                  </Accordion>
                                )}
                                {['date', 'time', 'datetime'].includes(selectedField.type) && (
                                  <Accordion title={`Date/Time Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Icon Color" value={getFS('iconColor') || ''} onChange={(v:any) => updateFS('iconColor', v)} />
                                    <SliderControl label="Icon Size" value={getFS('iconSize') || '20px'} onChange={(v:any) => updateFS('iconSize', v)} min={12} max={32} />
                                    <ColorControl label="Calendar Primary Color" value={getFS('calendarPrimary') || ''} onChange={(v:any) => updateFS('calendarPrimary', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'rating' && (
                                  <Accordion title={`Rating Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Icon Color (Active)" value={getFS('ratingActiveColor') || ''} onChange={(v:any) => updateFS('ratingActiveColor', v)} />
                                    <ColorControl label="Icon Color (Inactive)" value={getFS('ratingInactiveColor') || ''} onChange={(v:any) => updateFS('ratingInactiveColor', v)} />
                                    <SliderControl label="Icon Size" value={getFS('ratingSize') || '24px'} onChange={(v:any) => updateFS('ratingSize', v)} min={12} max={64} />
                                    {styleState === 'default' && (
                                      <div style={{ marginBottom: '16px' }}>
                                        <Checkbox label="Enable Hover Animation (Scale)" checked={selectedField.ratingHoverAnim !== false} onChange={(v) => updateSelectedField('ratingHoverAnim', v)} />
                                      </div>
                                    )}
                                  </Accordion>
                                )}
                                
                                {['scale', 'nps'].includes(selectedField.type) && (
                                  <Accordion title={`Scale / Slider Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Track Color (Filled)" value={getFS('trackFilledColor') || ''} onChange={(v:any) => updateFS('trackFilledColor', v)} />
                                    <ColorControl label="Track Color (Unfilled)" value={getFS('trackUnfilledColor') || ''} onChange={(v:any) => updateFS('trackUnfilledColor', v)} />
                                    <ColorControl label="Thumb Color" value={getFS('thumbColor') || ''} onChange={(v:any) => updateFS('thumbColor', v)} />
                                    <SliderControl label="Thumb Size" value={getFS('thumbSize') || '16px'} onChange={(v:any) => updateFS('thumbSize', v)} min={12} max={32} />
                                    <ColorControl label="Number Label Color" value={getFS('numberLabelColor') || ''} onChange={(v:any) => updateFS('numberLabelColor', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'color' && (
                                  <Accordion title={`Color Picker Styling (${styleState})`} defaultOpen={true}>
                                    <div style={{ marginBottom: '20px' }}><Select label="Swatch Shape" options={[{label:'Square',value:'square'},{label:'Circle',value:'circle'}]} value={getFS('swatchShape') || 'square'} onChange={(v) => updateFS('swatchShape', v)} /></div>
                                    <SliderControl label="Swatch Size" value={getFS('swatchSize') || '32px'} onChange={(v:any) => updateFS('swatchSize', v)} min={16} max={64} />
                                    <ColorControl label="Border Color" value={getFS('swatchBorderColor') || ''} onChange={(v:any) => updateFS('swatchBorderColor', v)} />
                                  </Accordion>
                                )}
                                
                                {['file', 'imageupload', 'videoupload', 'camera'].includes(selectedField.type) && (
                                  <Accordion title={`File Upload Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Upload Box Background" value={getFS('uploadBg') || ''} onChange={(v:any) => updateFS('uploadBg', v)} />
                                    <div style={{ marginBottom: '20px' }}><Select label="Border Style" options={[{label:'Dashed',value:'dashed'},{label:'Solid',value:'solid'},{label:'Dotted',value:'dotted'}]} value={getFS('uploadBorderStyle') || 'dashed'} onChange={(v) => updateFS('uploadBorderStyle', v)} /></div>
                                    <ColorControl label="Border Color" value={getFS('uploadBorderColor') || ''} onChange={(v:any) => updateFS('uploadBorderColor', v)} />
                                    <ColorControl label="Icon Color" value={getFS('uploadIconColor') || ''} onChange={(v:any) => updateFS('uploadIconColor', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'signature' && (
                                  <Accordion title={`Signature Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Pen Color" value={getFS('penColor') || ''} onChange={(v:any) => updateFS('penColor', v)} />
                                    <ColorControl label="Canvas Background" value={getFS('canvasBg') || ''} onChange={(v:any) => updateFS('canvasBg', v)} />
                                    <ColorControl label="Clear Button Color" value={getFS('clearBtnColor') || ''} onChange={(v:any) => updateFS('clearBtnColor', v)} />
                                  </Accordion>
                                )}
                                {selectedField.type === 'product' && (
                                  <Accordion title={`Product Picker Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Card Background" value={getFS('productCardBg') || ''} onChange={(v:any) => updateFS('productCardBg', v)} />
                                    <ColorControl label="Title Color" value={getFS('productTitleColor') || ''} onChange={(v:any) => updateFS('productTitleColor', v)} />
                                    <ColorControl label="Price Color" value={getFS('productPriceColor') || ''} onChange={(v:any) => updateFS('productPriceColor', v)} />
                                    <ColorControl label="Quantity Border" value={getFS('productQtyBorder') || ''} onChange={(v:any) => updateFS('productQtyBorder', v)} />
                                  </Accordion>
                                )}
                                
                                {['variant', 'collection'].includes(selectedField.type) && (
                                  <Accordion title={`${selectedField.type === 'variant' ? 'Variant' : 'Collection'} Picker Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Background Color" value={getFS('pickerBg') || ''} onChange={(v:any) => updateFS('pickerBg', v)} />
                                    <ColorControl label="Text Color" value={getFS('pickerTextColor') || ''} onChange={(v:any) => updateFS('pickerTextColor', v)} />
                                    <ColorControl label="Icon Color" value={getFS('pickerIconColor') || ''} onChange={(v:any) => updateFS('pickerIconColor', v)} />
                                  </Accordion>
                                )}
                                
                                {selectedField.type === 'price' && (
                                  <Accordion title={`Price Display Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Prefix/Suffix Background" value={getFS('pricePrefixBg') || ''} onChange={(v:any) => updateFS('pricePrefixBg', v)} />
                                    <ColorControl label="Text Color" value={getFS('priceTextColor') || ''} onChange={(v:any) => updateFS('priceTextColor', v)} />
                                    <ColorControl label="Border Color" value={getFS('priceBorderColor') || ''} onChange={(v:any) => updateFS('priceBorderColor', v)} />
                                  </Accordion>
                                )}

                                {selectedField.type === 'buttonselect' && (
                                  <Accordion title={`Button Group Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Segment Background (Inactive)" value={getFS('btnSegmentBg') || ''} onChange={(v:any) => updateFS('btnSegmentBg', v)} />
                                    <ColorControl label="Segment Background (Active)" value={getFS('btnSegmentActiveBg') || ''} onChange={(v:any) => updateFS('btnSegmentActiveBg', v)} />
                                    <ColorControl label="Segment Background (Hover)" value={getFS('btnSegmentHoverBg') || ''} onChange={(v:any) => updateFS('btnSegmentHoverBg', v)} />
                                    <ColorControl label="Text Color (Inactive)" value={getFS('btnSegmentText') || ''} onChange={(v:any) => updateFS('btnSegmentText', v)} />
                                    <ColorControl label="Text Color (Active)" value={getFS('btnSegmentActiveText') || ''} onChange={(v:any) => updateFS('btnSegmentActiveText', v)} />
                                    <ColorControl label="Divider Color" value={getFS('btnDividerColor') || ''} onChange={(v:any) => updateFS('btnDividerColor', v)} />
                                    <ColorControl label="Selected Border / Fill" value={getFS('btnSelectedBorder') || ''} onChange={(v:any) => updateFS('btnSelectedBorder', v)} />
                                    <SliderControl label="Corner Radius" value={getFS('btnCornerRadius') || '4px'} onChange={(v:any) => updateFS('btnCornerRadius', v)} min={0} max={50} />
                                    <ColorControl label="Icon Color" value={getFS('btnIconColor') || ''} onChange={(v:any) => updateFS('btnIconColor', v)} />
                                  </Accordion>
                                )}

                                {selectedField.type === 'imagechoice' && (
                                  <Accordion title={`Image Choice Styling (${styleState})`} defaultOpen={true}>
                                    <SliderControl label="Tile Size" value={getFS('imgTileSize') || '120px'} onChange={(v:any) => updateFS('imgTileSize', v)} min={60} max={300} />
                                    <div style={{ marginBottom: '20px' }}><Select label="Aspect Ratio" options={[{label:'Square (1:1)',value:'1/1'},{label:'Landscape (4:3)',value:'4/3'},{label:'Portrait (3:4)',value:'3/4'},{label:'Wide (16:9)',value:'16/9'}]} value={getFS('imgTileAspect') || '1/1'} onChange={(v) => updateFS('imgTileAspect', v)} /></div>
                                    <div style={{ marginBottom: '20px' }}><Select label="Image Fit" options={[{label:'Cover',value:'cover'},{label:'Contain',value:'contain'}]} value={getFS('imgTileFit') || 'cover'} onChange={(v) => updateFS('imgTileFit', v)} /></div>
                                    <SliderControl label="Gap Between Tiles" value={getFS('imgTileGap') || '8px'} onChange={(v:any) => updateFS('imgTileGap', v)} min={0} max={40} />
                                    <ColorControl label="Selected Border Color" value={getFS('imgSelectedBorder') || ''} onChange={(v:any) => updateFS('imgSelectedBorder', v)} />
                                    <SliderControl label="Selected Border Width" value={getFS('imgSelectedBorderWidth') || '2px'} onChange={(v:any) => updateFS('imgSelectedBorderWidth', v)} min={1} max={8} />
                                    <ColorControl label="Selected Overlay Color" value={getFS('imgSelectedOverlay') || ''} onChange={(v:any) => updateFS('imgSelectedOverlay', v)} />
                                    <ColorControl label="Checkmark Badge Color" value={getFS('imgCheckmarkColor') || ''} onChange={(v:any) => updateFS('imgCheckmarkColor', v)} />
                                    <div style={{ marginBottom: '20px' }}><Select label="Label Position" options={[{label:'Below tile',value:'below'},{label:'Overlay on tile',value:'overlay'},{label:'Hidden',value:'hidden'}]} value={getFS('imgLabelPosition') || 'below'} onChange={(v) => updateFS('imgLabelPosition', v)} /></div>
                                  </Accordion>
                                )}

                                {selectedField.type === 'multiselect' && (
                                  <Accordion title={`Multi-Select Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Tag Background" value={getFS('tagBg') || ''} onChange={(v:any) => updateFS('tagBg', v)} />
                                    <ColorControl label="Tag Text Color" value={getFS('tagText') || ''} onChange={(v:any) => updateFS('tagText', v)} />
                                    <ColorControl label="Tag Border Color" value={getFS('tagBorder') || ''} onChange={(v:any) => updateFS('tagBorder', v)} />
                                    <SliderControl label="Tag Border Radius" value={getFS('tagRadius') || '4px'} onChange={(v:any) => updateFS('tagRadius', v)} min={0} max={50} />
                                    <ColorControl label="Remove Badge Color" value={getFS('tagRemoveColor') || ''} onChange={(v:any) => updateFS('tagRemoveColor', v)} />
                                    <ColorControl label="Dropdown Background" value={getFS('msDropdownBg') || ''} onChange={(v:any) => updateFS('msDropdownBg', v)} />
                                    <ColorControl label="Dropdown Item Hover" value={getFS('msItemHover') || ''} onChange={(v:any) => updateFS('msItemHover', v)} />
                                    <ColorControl label="Dropdown Item Selected" value={getFS('msItemSelected') || ''} onChange={(v:any) => updateFS('msItemSelected', v)} />
                                  </Accordion>
                                )}

                                {selectedField.type === 'colorswatch' && (
                                  <Accordion title={`Color Swatch Styling (${styleState})`} defaultOpen={true}>
                                    <div style={{ marginBottom: '20px' }}><Select label="Swatch Shape" options={[{label:'Square',value:'square'},{label:'Circle',value:'circle'}]} value={getFS('colorSwatchShape') || 'circle'} onChange={(v) => updateFS('colorSwatchShape', v)} /></div>
                                    <SliderControl label="Swatch Size" value={getFS('colorSwatchSize') || '32px'} onChange={(v:any) => updateFS('colorSwatchSize', v)} min={16} max={80} />
                                    <ColorControl label="Selected Ring Color" value={getFS('colorSwatchRing') || ''} onChange={(v:any) => updateFS('colorSwatchRing', v)} />
                                    <SliderControl label="Selected Ring Width" value={getFS('colorSwatchRingWidth') || '2px'} onChange={(v:any) => updateFS('colorSwatchRingWidth', v)} min={1} max={6} />
                                    <SliderControl label="Gap Between Swatches" value={getFS('colorSwatchGap') || '8px'} onChange={(v:any) => updateFS('colorSwatchGap', v)} min={0} max={32} />
                                    <ColorControl label="Label Color" value={getFS('colorSwatchLabelColor') || ''} onChange={(v:any) => updateFS('colorSwatchLabelColor', v)} />
                                  </Accordion>
                                )}

                                {selectedField.type === 'discount' && (
                                  <Accordion title={`Coupon/Discount Styling (${styleState})`} defaultOpen={true}>
                                    <ColorControl label="Input Background" value={getFS('discountInputBg') || ''} onChange={(v:any) => updateFS('discountInputBg', v)} />
                                    <ColorControl label="Button Background" value={getFS('discountBtnBg') || ''} onChange={(v:any) => updateFS('discountBtnBg', v)} />
                                    <ColorControl label="Button Text Color" value={getFS('discountBtnText') || ''} onChange={(v:any) => updateFS('discountBtnText', v)} />
                                   </Accordion>
                                 )}
                               </>
                             );
                           })()}
                         </>
                       );
                     })()}
                   </>
                 )}
               </div>
             )}

            {rightTab === 'logic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {!selectedField ? (
                  <div style={{ color: 'var(--p-color-text-subdued)' }}>Select a field to configure its conditional logic.</div>
                ) : (
                  <>
                    <div className="custom-label" style={{ fontSize: '16px', marginBottom: '8px' }}>Conditional Logic</div>
                    <Select 
                      label="Action" 
                      options={[{label: 'Show', value: 'show'}, {label: 'Hide', value: 'hide'}]} 
                      value={selectedField.logic?.action || 'show'} 
                      onChange={(v) => updateSelectedField('logic', { ...(selectedField.logic || {}), action: v })} 
                    />
                    <Select 
                      label="Match Type" 
                      options={[{label: 'ALL of the following (AND)', value: 'all'}, {label: 'ANY of the following (OR)', value: 'any'}]} 
                      value={selectedField.logic?.matchType || 'all'} 
                      onChange={(v) => updateSelectedField('logic', { ...(selectedField.logic || {}), matchType: v })} 
                    />
                    
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Conditions</div>
                      {(selectedField.logic?.conditions || []).map((cond: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Select 
                            label="Source Field" 
                            labelHidden
                            options={[{label: 'Select Field...', value: ''}, ...fields.filter(f => f.id !== selectedField.id).map(f => ({ label: f.label || f.type, value: f.id }))]}
                            value={cond.sourceId || ''} 
                            onChange={(v) => {
                              const newConds = [...(selectedField.logic?.conditions || [])];
                              newConds[idx].sourceId = v;
                              updateSelectedField('logic', { ...(selectedField.logic || {}), conditions: newConds });
                            }} 
                          />
                          <Select 
                            label="Operator"
                            labelHidden
                            options={[{label:'is equal to',value:'=='},{label:'is not equal to',value:'!='},{label:'contains',value:'contains'},{label:'is empty',value:'empty'},{label:'is greater than',value:'>'},{label:'is less than',value:'<'}]}
                            value={cond.operator || '=='} 
                            onChange={(v) => {
                              const newConds = [...(selectedField.logic?.conditions || [])];
                              newConds[idx].operator = v;
                              updateSelectedField('logic', { ...(selectedField.logic || {}), conditions: newConds });
                            }} 
                          />
                          {cond.operator !== 'empty' && (
                            <TextField 
                              label="Value" 
                              labelHidden
                              autoComplete="off"
                              placeholder="Value..."
                              value={cond.value || ''} 
                              onChange={(v) => {
                                const newConds = [...(selectedField.logic?.conditions || [])];
                                newConds[idx].value = v;
                                updateSelectedField('logic', { ...(selectedField.logic || {}), conditions: newConds });
                              }} 
                            />
                          )}
                          <Button size="micro" tone="critical" onClick={() => {
                            const newConds = [...(selectedField.logic?.conditions || [])];
                            newConds.splice(idx, 1);
                            updateSelectedField('logic', { ...(selectedField.logic || {}), conditions: newConds });
                          }}>Remove</Button>
                        </div>
                      ))}
                      <Button size="micro" onClick={() => {
                        const newConds = [...(selectedField.logic?.conditions || [])];
                        newConds.push({ sourceId: '', operator: '==', value: '' });
                        updateSelectedField('logic', { action: selectedField.logic?.action || 'show', matchType: selectedField.logic?.matchType || 'all', conditions: newConds });
                      }}>+ Add Condition</Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {rightTab === 'advanced' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="custom-label" style={{ fontSize: '16px', marginBottom: '0' }}>Advanced Settings</div>
                  {plan === 'FREE' && <Badge tone="warning" size="small">Starter+</Badge>}
                </div>
                
                {selectedField ? (
                  <div>
                    <TextField label="Custom CSS Class" placeholder="my-custom-class" value={selectedField.customClass || ''} onChange={(v) => updateSelectedField('customClass', v)} autoComplete="off" />
                    
                    <div style={{ marginTop: '8px' }}>
                      <div className="custom-label" style={{ fontSize: '13px', marginBottom: '4px' }}>Custom Attributes (Key-Value)</div>
                      {(selectedField.customAttributes || []).map((attr: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <TextField labelHidden label="Key" placeholder="data-id" value={attr.key || ''} onChange={(v) => {
                            const newAttrs = [...(selectedField.customAttributes || [])];
                            newAttrs[idx].key = v;
                            updateSelectedField('customAttributes', newAttrs);
                          }} autoComplete="off" />
                          <TextField labelHidden label="Value" placeholder="123" value={attr.value || ''} onChange={(v) => {
                            const newAttrs = [...(selectedField.customAttributes || [])];
                            newAttrs[idx].value = v;
                            updateSelectedField('customAttributes', newAttrs);
                          }} autoComplete="off" />
                          <Button size="micro" tone="critical" onClick={() => {
                            const newAttrs = [...(selectedField.customAttributes || [])];
                            newAttrs.splice(idx, 1);
                            updateSelectedField('customAttributes', newAttrs);
                          }}>X</Button>
                        </div>
                      ))}
                      <Button size="micro" onClick={() => {
                        const newAttrs = [...(selectedField.customAttributes || [])];
                        newAttrs.push({ key: '', value: '' });
                        updateSelectedField('customAttributes', newAttrs);
                      }}>+ Add Attribute</Button>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <TextField label="Scoped Custom CSS" placeholder=".nf-field { border: 1px solid red; }" value={selectedField.customCss || ''} onChange={(v) => updateSelectedField('customCss', v)} autoComplete="off" multiline={5} helpText="Use .nf-field to target this specific field's wrapper." />
                    </div>
                  </div>
                ) : (
                  <div>
                    <TextField label="Form Custom CSS Class" placeholder="my-form-class" value={formCustomClass || ''} onChange={(v) => setFormCustomClass(v)} autoComplete="off" />
                    <div style={{ marginTop: '8px' }}>
                      <TextField label="Global Custom CSS" placeholder=".nf-form-wrapper { background: #fff; }" value={globalCustomCss || ''} onChange={(v) => setGlobalCustomCss(v)} autoComplete="off" multiline={10} helpText="CSS written here will apply globally to the entire form." />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Scrollable>
        </div>

      </div>
      <MediaPickerModal open={activePicker?.type === 'media'} onClose={() => setActivePicker(null)} onSelect={(url) => { if(activePicker) activePicker.callback(url); setActivePicker(null); }} />
      <IconPickerModal open={activePicker?.type === 'icon'} onClose={() => setActivePicker(null)} onSelect={(url) => { if(activePicker) activePicker.callback(url); setActivePicker(null); }} />
    </div>
  );
}
