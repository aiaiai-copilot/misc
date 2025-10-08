import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  ApplicationContainer,
  DependencyDescriptor,
  ServiceLifetime,
  CreateRecordUseCase,
  SearchRecordsUseCase,
  UpdateRecordUseCase,
  DeleteRecordUseCase,
  GetTagSuggestionsUseCase,
  ExportDataUseCase,
  ImportDataUseCase,
  ImportValidator,
  SearchModeDetector,
  TagCloudBuilder,
} from '@misc-poc/application';
import { TagFactory } from '@misc-poc/domain';
import {
  ApiRecordRepository,
  ApiTagRepository,
  ApiUnitOfWork,
} from '@misc-poc/infrastructure-api';
import { RecordApiClient } from '../services/RecordApiClient.js';

export interface ApplicationContextValue {
  createRecordUseCase: CreateRecordUseCase | null;
  searchRecordsUseCase: SearchRecordsUseCase | null;
  updateRecordUseCase: UpdateRecordUseCase | null;
  deleteRecordUseCase: DeleteRecordUseCase | null;
  getTagSuggestionsUseCase: GetTagSuggestionsUseCase | null;
  exportDataUseCase: ExportDataUseCase | null;
  importDataUseCase: ImportDataUseCase | null;
  searchModeDetector: SearchModeDetector | null;
  tagCloudBuilder: TagCloudBuilder | null;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export interface ApplicationContextProviderProps {
  children: ReactNode;
}

export const ApplicationContextProvider: React.FC<
  ApplicationContextProviderProps
> = ({ children }) => {
  const [contextValue, setContextValue] = useState<ApplicationContextValue>({
    createRecordUseCase: null,
    searchRecordsUseCase: null,
    updateRecordUseCase: null,
    deleteRecordUseCase: null,
    getTagSuggestionsUseCase: null,
    exportDataUseCase: null,
    importDataUseCase: null,
    searchModeDetector: null,
    tagCloudBuilder: null,
  });

  useEffect(() => {
    const initializeContainer = (): void => {
      try {
        const container = new ApplicationContainer();

        // Get API base URL from environment or use default
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

        // Create API client
        const apiClient = new RecordApiClient({
          baseUrl: apiBaseUrl,
        });

        console.log('API client created with base URL:', apiBaseUrl);

        // Create repositories
        const recordRepository = new ApiRecordRepository(apiClient);
        const tagRepository = new ApiTagRepository(apiClient);
        const unitOfWork = new ApiUnitOfWork(recordRepository, tagRepository);

        // Register repositories
        container.register(
          'recordRepository',
          new DependencyDescriptor(() => {
            console.log('Using ApiRecordRepository');
            return recordRepository;
          }, ServiceLifetime.SINGLETON)
        );

        container.register(
          'tagRepository',
          new DependencyDescriptor(
            () => tagRepository,
            ServiceLifetime.SINGLETON
          )
        );

        container.register(
          'unitOfWork',
          new DependencyDescriptor(
            () => unitOfWork,
            ServiceLifetime.SINGLETON
          )
        );

        // Register services
        container.register(
          'importValidator',
          new DependencyDescriptor(
            () => new ImportValidator(),
            ServiceLifetime.SINGLETON
          )
        );

        container.register(
          'tagFactory',
          new DependencyDescriptor(
            () => new TagFactory(),
            ServiceLifetime.SINGLETON
          )
        );

        // Register use cases
        container.register(
          'createRecordUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new CreateRecordUseCase(
                deps.recordRepository as ApiRecordRepository,
                deps.tagRepository as ApiTagRepository,
                deps.unitOfWork as ApiUnitOfWork
              ),
            ServiceLifetime.SINGLETON,
            ['recordRepository', 'tagRepository', 'unitOfWork']
          )
        );

        container.register(
          'searchRecordsUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new SearchRecordsUseCase(
                deps.recordRepository as ApiRecordRepository
              ),
            ServiceLifetime.SINGLETON,
            ['recordRepository']
          )
        );

        container.register(
          'updateRecordUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new UpdateRecordUseCase(
                deps.recordRepository as ApiRecordRepository,
                deps.tagRepository as ApiTagRepository,
                deps.unitOfWork as ApiUnitOfWork
              ),
            ServiceLifetime.SINGLETON,
            ['recordRepository', 'tagRepository', 'unitOfWork']
          )
        );

        container.register(
          'deleteRecordUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new DeleteRecordUseCase(
                deps.recordRepository as ApiRecordRepository,
                deps.unitOfWork as ApiUnitOfWork
              ),
            ServiceLifetime.SINGLETON,
            ['recordRepository', 'unitOfWork']
          )
        );

        container.register(
          'getTagSuggestionsUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new GetTagSuggestionsUseCase(
                deps.tagRepository as ApiTagRepository
              ),
            ServiceLifetime.SINGLETON,
            ['tagRepository']
          )
        );

        container.register(
          'exportDataUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new ExportDataUseCase(
                deps.recordRepository as ApiRecordRepository,
                deps.tagRepository as ApiTagRepository
              ),
            ServiceLifetime.SINGLETON,
            ['recordRepository', 'tagRepository']
          )
        );

        container.register(
          'importDataUseCase',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new ImportDataUseCase(
                deps.unitOfWork as ApiUnitOfWork,
                deps.importValidator as ImportValidator,
                deps.tagFactory as TagFactory
              ),
            ServiceLifetime.SINGLETON,
            ['unitOfWork', 'importValidator', 'tagFactory']
          )
        );

        // Register SearchModeDetector and TagCloudBuilder services
        container.register(
          'searchModeDetector',
          new DependencyDescriptor(
            () => new SearchModeDetector(),
            ServiceLifetime.SINGLETON
          )
        );

        container.register(
          'tagCloudBuilder',
          new DependencyDescriptor(
            (deps: Record<string, unknown>) =>
              new TagCloudBuilder(
                deps.tagRepository as ApiTagRepository
              ),
            ServiceLifetime.SINGLETON,
            ['tagRepository']
          )
        );

        // Resolve all use cases and services
        const createRecordResult = container.resolve<CreateRecordUseCase>(
          'createRecordUseCase'
        );
        const searchRecordsResult = container.resolve<SearchRecordsUseCase>(
          'searchRecordsUseCase'
        );
        const updateRecordResult = container.resolve<UpdateRecordUseCase>(
          'updateRecordUseCase'
        );
        const deleteRecordResult = container.resolve<DeleteRecordUseCase>(
          'deleteRecordUseCase'
        );
        const getTagSuggestionsResult =
          container.resolve<GetTagSuggestionsUseCase>(
            'getTagSuggestionsUseCase'
          );
        const exportDataResult =
          container.resolve<ExportDataUseCase>('exportDataUseCase');
        const importDataResult =
          container.resolve<ImportDataUseCase>('importDataUseCase');
        const searchModeDetectorResult =
          container.resolve<SearchModeDetector>('searchModeDetector');
        const tagCloudBuilderResult =
          container.resolve<TagCloudBuilder>('tagCloudBuilder');

        if (
          createRecordResult.isOk() &&
          searchRecordsResult.isOk() &&
          updateRecordResult.isOk() &&
          deleteRecordResult.isOk() &&
          getTagSuggestionsResult.isOk() &&
          exportDataResult.isOk() &&
          importDataResult.isOk() &&
          searchModeDetectorResult.isOk() &&
          tagCloudBuilderResult.isOk()
        ) {
          setContextValue({
            createRecordUseCase: createRecordResult.unwrap(),
            searchRecordsUseCase: searchRecordsResult.unwrap(),
            updateRecordUseCase: updateRecordResult.unwrap(),
            deleteRecordUseCase: deleteRecordResult.unwrap(),
            getTagSuggestionsUseCase: getTagSuggestionsResult.unwrap(),
            exportDataUseCase: exportDataResult.unwrap(),
            importDataUseCase: importDataResult.unwrap(),
            searchModeDetector: searchModeDetectorResult.unwrap(),
            tagCloudBuilder: tagCloudBuilderResult.unwrap(),
          });
          console.log('Application context initialized successfully');
        } else {
          console.error('Failed to resolve use cases from container:');
          console.error(
            'createRecordResult:',
            createRecordResult.isOk() ? 'OK' : createRecordResult.unwrapErr()
          );
          console.error(
            'searchRecordsResult:',
            searchRecordsResult.isOk() ? 'OK' : searchRecordsResult.unwrapErr()
          );
          console.error(
            'updateRecordResult:',
            updateRecordResult.isOk() ? 'OK' : updateRecordResult.unwrapErr()
          );
          console.error(
            'deleteRecordResult:',
            deleteRecordResult.isOk() ? 'OK' : deleteRecordResult.unwrapErr()
          );
        }
      } catch (error) {
        console.error('Error initializing ApplicationContainer:', error);
      }
    };

    initializeContainer();
  }, []);

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplicationContext = (): ApplicationContextValue => {
  const context = useContext(ApplicationContext);

  if (context === null) {
    throw new Error(
      'useApplicationContext must be used within ApplicationContextProvider'
    );
  }

  return context;
};
