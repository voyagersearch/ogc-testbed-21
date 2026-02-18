import { useState } from 'react';
import { Settings as SettingsIcon, X, Check } from 'lucide-react';

interface SettingsProps {
  baseUrl: string;
  displayTemplateId: string;
  transformApiUrl: string;
  standardsApiUrl: string;
  onBaseUrlChange: (url: string) => void;
  onDisplayTemplateIdChange: (id: string) => void;
  onTransformApiUrlChange: (url: string) => void;
  onStandardsApiUrlChange: (url: string) => void;
}

export function Settings({ baseUrl, displayTemplateId, transformApiUrl, standardsApiUrl, onBaseUrlChange, onDisplayTemplateIdChange, onTransformApiUrlChange, onStandardsApiUrlChange }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(baseUrl);
  const [tempTemplateId, setTempTemplateId] = useState(displayTemplateId);
  const [tempTransformApiUrl, setTempTransformApiUrl] = useState(transformApiUrl);
  const [tempStandardsApiUrl, setTempStandardsApiUrl] = useState(standardsApiUrl);

  const handleSave = () => {
    onBaseUrlChange(tempUrl);
    onDisplayTemplateIdChange(tempTemplateId);
    onTransformApiUrlChange(tempTransformApiUrl);
    onStandardsApiUrlChange(tempStandardsApiUrl);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempUrl(baseUrl);
    setTempTemplateId(displayTemplateId);
    setTempTransformApiUrl(transformApiUrl);
    setTempStandardsApiUrl(standardsApiUrl);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-[#F5F2ED] rounded-lg transition-colors"
        title="Settings"
      >
        <SettingsIcon className="w-5 h-5 text-[#8A7F75]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5DDD2]">
              <h2 className="text-lg font-semibold text-[#6B605A]">Settings</h2>
              <button
                onClick={handleCancel}
                className="p-1 hover:bg-[#F5F2ED] rounded transition-colors"
              >
                <X className="w-5 h-5 text-[#8A7F75]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label
                  htmlFor="baseUrl"
                  className="block text-sm font-medium text-[#7A6F65] mb-1"
                >
                  Voyager Instance Base URL
                </label>
                <input
                  id="baseUrl"
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://ogc-sdi.voyagersearch.com/"
                  className="w-full px-3 py-2 border border-[#E5DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] bg-white text-[#6B605A]"
                />
                <p className="mt-1 text-xs text-[#A39A91]">
                  Enter the base URL of your Voyager instance (include trailing slash)
                </p>
              </div>

              <div>
                <label
                  htmlFor="displayTemplateId"
                  className="block text-sm font-medium text-[#7A6F65] mb-1"
                >
                  Display Template ID
                </label>
                <input
                  id="displayTemplateId"
                  type="text"
                  value={tempTemplateId}
                  onChange={(e) => setTempTemplateId(e.target.value)}
                  placeholder="D187992491DF"
                  className="w-full px-3 py-2 border border-[#E5DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] bg-white text-[#6B605A]"
                />
                <p className="mt-1 text-xs text-[#A39A91]">
                  Enter the Display Template ID for your Voyager instance
                </p>
              </div>

              <div>
                <label
                  htmlFor="transformApiUrl"
                  className="block text-sm font-medium text-[#7A6F65] mb-1"
                >
                  Transform API URL
                </label>
                <input
                  id="transformApiUrl"
                  type="text"
                  value={tempTransformApiUrl}
                  onChange={(e) => setTempTransformApiUrl(e.target.value)}
                  placeholder="https://example.com/api/transform"
                  className="w-full px-3 py-2 border border-[#E5DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] bg-white text-[#6B605A]"
                />
                <p className="mt-1 text-xs text-[#A39A91]">
                  Enter the Transform API endpoint URL
                </p>
              </div>

              <div>
                <label
                  htmlFor="standardsApiUrl"
                  className="block text-sm font-medium text-[#7A6F65] mb-1"
                >
                  Standards API URL
                </label>
                <input
                  id="standardsApiUrl"
                  type="text"
                  value={tempStandardsApiUrl}
                  onChange={(e) => setTempStandardsApiUrl(e.target.value)}
                  placeholder="https://example.com/api/standards"
                  className="w-full px-3 py-2 border border-[#E5DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B9B8D] bg-white text-[#6B605A]"
                />
                <p className="mt-1 text-xs text-[#A39A91]">
                  Enter the Standards API endpoint URL
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-[#E5DDD2] bg-[#F9F7F4]">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-[#7A6F65] hover:bg-[#F5F2ED] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-[#8B9B8D] hover:bg-[#7A8A7D] rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
